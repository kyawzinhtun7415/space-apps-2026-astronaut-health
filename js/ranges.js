// Published reference numbers, each with its named source. No number here is the team's own.
// clinical() returns { level, why, score }.
// How levels are set: where the NEWS2 chart gives a score, a score of 3 is "serious" and a score of 1 or 2 is "watch".
// Where a chart has no scores, outside its normal range is "watch" and its severe band is "serious".
(function (root) {
  var S = {
    nih_bp: { name: "NIH MedlinePlus, high blood pressure", url: "https://medlineplus.gov/highbloodpressure.html" },
    nih_hr: { name: "NIH MedlinePlus, pulse", url: "https://medlineplus.gov/ency/article/003399.htm" },
    rcp: { name: "NEWS2 scoring chart, Royal College of Physicians", url: "https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf" },
    ada_dx: { name: "American Diabetes Association, diagnosis", url: "https://diabetes.org/about-diabetes/diagnosis" },
    ada_low: { name: "American Diabetes Association, low blood glucose", url: "https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose" },
    cdc: { name: "US CDC, about sleep", url: "https://www.cdc.gov/sleep/about/index.html" },
    norsk: { name: "Norsk et al. 2015", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4324706/" },
    stahn: { name: "Stahn et al. 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078/" },
    tb041: { name: "NASA OCHMO-TB-041 Rev B, sleep accommodations", url: "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf" },
    axiom: { name: "Axiom Space release, 26 Sep 2025", url: "https://axiomspace.com/release/suite-ride-research-unlocks-potential-for-first-astronaut-with-diabetes" },
    biomon: { name: "Canadian Space Agency, Bio-Monitor", url: "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp" },
    archer: { name: "NASA, ARCHeR study", url: "https://www.nasa.gov/reference/archer/" },
    dist: { name: "NASA, Hazard: Distance From Earth", url: "https://www.nasa.gov/hrp/hazard-distance-from-earth/" }
  };
  var NEWS_NOTE = " NEWS2 was designed for hospital patients, so it is a rough guide here.";
  function ok(note) { return { level: "ok", why: "", score: 0, note: note || "" }; }
  function flag(score, why) { return { level: score >= 3 ? "serious" : "watch", why: why, score: score }; }
  root.SOURCES = S;
  root.RANGES = {
    bp: {
      label: "Blood pressure", unit: "mmHg", region: "chest", hazard: "gravity",
      feed: "Simulated shirt sensor feed, one value at a time.",
      inSpace: "Yes. The Canadian Bio-Monitor shirt on the space station records blood pressure and pulse.", inSpaceSource: S.biomon,
      clinicalText: "Normal is less than 120 and less than 80. 130 to 139 or 80 to 89 is stage 1 high. Higher than 180 and higher than 120 is a crisis on the NIH table. On the NEWS2 chart a top number of 111 to 219 scores 0, 101 to 110 scores 1, 91 to 100 scores 2, and 90 or less, or 220 or more, scores 3." + NEWS_NOTE,
      clinicalSources: [S.nih_bp, S.rcp],
      clinical: function (v) {
        if (v.sys <= 90) return flag(3, "A top number of 90 or less scores 3 on the NEWS2 chart.");
        if (v.sys >= 220) return flag(3, "A top number of 220 or more scores 3 on the NEWS2 chart.");
        if (v.sys > 180 || v.dia > 120) return { level: "serious", score: null, why: "Above 180 on top or above 120 on the bottom is treated here as the crisis band. The NIH table lists higher than 180 and higher than 120 and says to seek medical care right away. Acting on either number alone is this team's choice." };
        if (v.sys <= 100) return flag(2, "A top number of 91 to 100 scores 2 on the NEWS2 chart.");
        if (v.sys <= 110) return flag(1, "A top number of 101 to 110 scores 1 on the NEWS2 chart. It is still below 120, which the NIH table calls normal.");
        if (v.sys >= 130 || v.dia >= 80) return { level: "watch", score: null, why: "130 or higher, or 80 or higher on the bottom number, is stage 1 or above on the NIH table." };
        return ok();
      },
      space: { shift: -8, fromDay: 85, text: "24-hour averages 8 to 10 mmHg lower on long station flights (top number 8 lower).",
        study: "8 men aged 45 to 53, one 24-hour arm cuff recording each, between flight day 85 and 192. An average for a small group, not a rule for one reading. Before day 85 there is no measurement to compare with.", source: S.norsk }
    },
    hr: {
      label: "Heart rate", unit: "bpm", region: "chest", hazard: "gravity",
      feed: "Simulated shirt sensor feed.",
      inSpace: "Yes. The Canadian Bio-Monitor shirt on the space station records pulse.", inSpaceSource: S.biomon,
      clinicalText: "For adults a normal pulse at rest is 60 to 100 beats per minute.",
      clinicalSources: [S.nih_hr],
      clinical: function (v) { return (v < 60 || v > 100) ? { level: "watch", score: null, why: "Outside 60 to 100 beats per minute at rest (NIH MedlinePlus)." } : ok(); },
      space: { shift: null, text: "No shift measured: the 24-hour mean heart rate was unchanged (64 against 63).",
        study: "Same study: 8 men, 24-hour recordings.", source: S.norsk }
    },
    temp: {
      label: "Body temperature (core)", unit: "°C", region: "core", hazard: "closed",
      feed: "Simulated forehead sensor check. Skin temperature from a shirt is a different measurement and gets no shift.",
      inSpace: "Yes. The study behind the space shift estimated core temperature in flight with a forehead heat-flux sensor.", inSpaceSource: S.stahn,
      clinicalText: "On the NEWS2 chart 36.1 to 38.0 scores 0, 35.1 to 36.0 and 38.1 to 39.0 score 1, 39.1 or more scores 2, and 35.0 or less scores 3." + NEWS_NOTE,
      clinicalSources: [S.rcp],
      clinical: function (v) {
        if (v <= 35.0) return flag(3, "35.0 or less scores 3 on the NEWS2 chart.");
        if (v >= 39.1) return flag(2, "39.1 or more scores 2 on the NEWS2 chart.");
        if (v > 38.0) return flag(1, "38.1 to 39.0 scores 1 on the NEWS2 chart.");
        if (v < 36.1) return flag(1, "35.1 to 36.0 scores 1 on the NEWS2 chart.");
        return ok();
      },
      space: { shift: 1.0, rampDays: 75, text: "Resting core temperature about 1 °C higher, building gradually over 2.5 months.",
        study: "11 astronauts. Core temperature was estimated with a forehead heat-flux sensor. It rose higher and faster in exercise, so the shift is a strain, not a comfort. This tool assumes a straight-line build-up to day 75; the study only says gradual.", source: S.stahn }
    },
    sleep: {
      label: "Sleep last night", unit: "h", region: "head", hazard: "isolation",
      feed: "Simulated wrist sensor.",
      inSpace: "Yes. NASA's ARCHeR study collects sleep and activity with a wrist sensor during Artemis missions.", inSpaceSource: S.archer,
      clinicalText: "Adults aged 18 to 60 need 7 or more hours a night.",
      clinicalSources: [S.cdc],
      clinical: function (v) { return v < 7 ? { level: "watch", score: null, why: "Below the 7 hours adults need (US CDC)." } : ok(); },
      space: { shift: null, text: "Crews sleep about 6 hours a night in space. That is common, not harmless: NASA says seven days of six hours performs like 24 to 36 hours awake.",
        study: "NASA technical brief.", source: S.tb041 }
    },
    glucose: {
      label: "Blood sugar (morning, before food)", unit: "mg/dL", region: "arm", hazard: "distance",
      feed: "Simulated arm sensor. The morning value before food is used, because the reference range is a fasting one.",
      inSpace: "Being tested. Continuous glucose monitors were tested on the space station in 2025.", inSpaceSource: S.axiom,
      clinicalText: "Fasting normal is less than 100 mg/dL. Low is below 70 mg/dL.",
      clinicalSources: [S.ada_dx, S.ada_low],
      clinical: function (v) {
        if (v < 70) return { level: "watch", score: null, why: "Below 70 mg/dL is low (American Diabetes Association)." };
        if (v >= 100) return { level: "watch", score: null, why: "100 mg/dL or more when fasting is above normal (American Diabetes Association)." };
        return ok();
      },
      space: { shift: null, text: "No measured space shift found.", study: "", source: null }
    },
    mood: {
      label: "Mood (one tap, 1 to 5)", unit: "/ 5", region: "head", hazard: "isolation",
      feed: "One tap by the crew member. No automatic mood sensor was found.",
      inSpace: "Yes, by self-report. NASA's ARCHeR study uses behavioral surveys.", inSpaceSource: S.archer,
      clinicalText: "No reference shown. This one-tap scale is the team's own and has no clinical range.",
      clinicalSources: [],
      clinical: function () { return ok(); },
      space: { shift: null, text: "No measured space shift found.", study: "", source: null }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
