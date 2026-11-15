// "Readings check for today's task". An example by this team. It never says fit or cleared.
(function (root) {
  var NOT_MEASURED = ["aerobic capacity", "balance and coordination", "thinking and behaviour tests", "blood and immune status"];
  function checkTask(task, res, RULES, RANGES, redFlagsTicked) {
    var reasons = [], missing = [], flagged = [];
    if (redFlagsTicked && redFlagsTicked.length) {
      return { answer: "redflag", word: "Tell the crew medical officer now",
        reasons: ["You ticked: " + redFlagsTicked.join(", ") + ". A symptom like this goes to the crew medical officer whatever the readings say."], notMeasured: NOT_MEASURED };
    }
    task.needs.forEach(function (k) {
      var a = res[k];
      if (a.status === "cannot") { missing.push(RANGES[k].label); return; }
      // Short sleep holds a task only below the team's own line; a 6 to 7 hour night is common in space.
      if (k === "sleep") { if (a.v < RULES.sleepHoldBelow) flagged.push(RANGES[k].label + " (" + a.v.toFixed(1) + " h, under " + RULES.sleepHoldBelow + ")"); return; }
      if (a.status === "watch" || a.status === "serious") flagged.push(RANGES[k].label);
    });
    var t = res.temp;
    var tempFlagged = t && (t.status === "watch" || t.status === "serious") && task.needs.indexOf("temp") !== -1;
    var warm = task.exertion && RULES.tempTightensExertion && t && t.v !== null && t.d >= RULES.tempRiseForExertion;
    if (flagged.length) reasons.push("Flagged: " + flagged.join(", ") + ".");
    if (warm && !tempFlagged) reasons.push("Core temperature is " + t.d.toFixed(1) + " °C above your baseline. In the study it rose higher and faster in exercise, so this task waits for a re-check.");
    if (missing.length) reasons.push("No valid reading: " + missing.join(", ") + ".");
    if (flagged.length || warm) return { answer: "hold", word: "Hold and re-check", reasons: reasons, notMeasured: NOT_MEASURED };
    if (missing.length) return { answer: "cannot", word: "Cannot assess", reasons: reasons, notMeasured: NOT_MEASURED };
    return { answer: "clear", word: "Nothing flagged in these " + task.needs.length + " readings",
      reasons: ["None of the readings this task looks at is flagged. That is all this check can say."], notMeasured: NOT_MEASURED };
  }
  root.TASKS = { checkTask: checkTask, NOT_MEASURED: NOT_MEASURED };
})(typeof window !== "undefined" ? window : globalThis);
