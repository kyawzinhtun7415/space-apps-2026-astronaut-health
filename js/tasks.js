// "Readings check for today's task". An example by this team. It never says fit or cleared.
(function (root) {
  var NOT_MEASURED = ["aerobic capacity", "balance and coordination", "thinking and behaviour tests", "blood and immune status"];
  function checkTask(task, res, RULES, RANGES, redFlagsTicked) {
    var reasons = [], missing = [], flagged = [], belowLine = [];
    if (redFlagsTicked && redFlagsTicked.length) {
      return { answer: "redflag", word: "Tell the crew medical officer now",
        reasons: ["You ticked: " + redFlagsTicked.join(", ") + ". A symptom like this goes to the crew medical officer whatever the readings say."], notMeasured: NOT_MEASURED };
    }
    var canFlag = task.needs.filter(function (k) { return k !== "mood"; });
    task.needs.forEach(function (k) {
      var a = res[k];
      if (a.status === "cannot") { missing.push(RANGES[k].label); return; }
      if (k === "sleep") {
        // Short sleep holds a task only below the team's own line; a 6 to 7 hour night is common in space.
        if (a.v < RULES.sleepHoldBelow) flagged.push(RANGES[k].label + " (" + a.v.toFixed(1) + " h, under this team's " + RULES.sleepHoldBelow + "-hour hold line)");
        else if (a.status === "watch") belowLine.push("Sleep is flagged (" + a.v.toFixed(1) + " h, under 7) but above this team's " + RULES.sleepHoldBelow + "-hour hold line, so it does not hold this task.");
        return;
      }
      if (a.status === "watch" || a.status === "serious") flagged.push(RANGES[k].label);
    });
    var t = res.temp;
    var tempFlagged = t && (t.status === "watch" || t.status === "serious") && task.needs.indexOf("temp") !== -1;
    // An unexplained rise holds exertion. A rise that matches the measured space shift does not, but is called out.
    var warm = task.exertion && RULES.tempTightensExertion && t && t.status === "changed" && t.dir === "up" && t.d >= RULES.tempRiseForExertion;
    var shiftNote = task.exertion && t && t.status === "expected" && task.needs.indexOf("temp") !== -1;
    if (flagged.length) reasons.push("Flagged: " + flagged.join(", ") + ".");
    if (warm && !tempFlagged) reasons.push("Core temperature is " + t.d.toFixed(1) + " °C above your baseline, more than the space shift explains today. In the study it rose higher and faster in exercise, so this task waits for a re-check.");
    if (shiftNote) belowLine.push("Core temperature shows the shift measured in space crews. It rises higher and faster in exercise, so stop if you feel overheated.");
    if (missing.length) reasons.push("No valid reading: " + missing.join(", ") + ".");
    reasons = reasons.concat(belowLine);
    if (task.needs.indexOf("mood") !== -1) reasons.push("Mood has no clinical range, so it cannot flag here.");
    if (flagged.length || warm) return { answer: "hold", word: "Hold and re-check", reasons: reasons, notMeasured: NOT_MEASURED };
    if (missing.length) return { answer: "cannot", word: "Cannot assess", reasons: reasons, notMeasured: NOT_MEASURED };
    var n = canFlag.length, held = belowLine.length;
    return { answer: "clear", word: held ? "No hold from these readings" : "Nothing flagged in " + n + (n === 1 ? " reading" : " readings"),
      reasons: (held ? [] : ["None of the " + n + " readings that can flag for this task is flagged. That is all this check can say."]).concat(reasons), notMeasured: NOT_MEASURED };
  }
  root.TASKS = { checkTask: checkTask, NOT_MEASURED: NOT_MEASURED };
})(typeof window !== "undefined" ? window : globalThis);
