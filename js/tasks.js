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
    if (res.mood && res.mood.status === "watch" && task.needs.indexOf("mood") !== -1) flagged.push(RANGES.mood.label + " (at the bottom of this team's scale)");
    task.needs.forEach(function (k) {
      var a = res[k];
      if (a.status === "cannot") { missing.push(RANGES[k].label); return; }
      if (k === "sleep") {
        // Short sleep holds a task only below the team's own line; a 6 to 7 hour night is common in space.
        var line = task.sleepHoldBelow || RULES.sleepHoldBelow, h = (Math.floor(a.v * 10 + 1e-9) / 10).toFixed(1);
        if (a.v < line) flagged.push(RANGES[k].label + " (" + h + " h, under this team's " + line + "-hour hold line for this task)");
        else if (a.status === "watch") belowLine.push("Sleep is flagged (" + h + " h, under 7) but above this team's " + line + "-hour hold line for this task, so it does not hold it.");
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
    if (task.needs.indexOf("mood") !== -1 && !(res.mood && res.mood.status === "watch")) reasons.push("Mood has no clinical range. It only counts here at the very bottom of this team's scale.");
    if (flagged.length || warm) return { answer: "hold", word: "Hold and re-check", reasons: reasons, notMeasured: NOT_MEASURED };
    if (missing.length) return { answer: "cannot", word: "Cannot assess", reasons: reasons, notMeasured: NOT_MEASURED };
    var n = canFlag.length, held = belowLine.length;
    return { answer: "clear", word: held ? "Not held by these readings" : "Nothing flagged in " + n + (n === 1 ? " reading" : " readings"),
      reasons: (held ? [] : ["None of the " + n + " readings that can flag for this task is flagged."]).concat(reasons, ["This is a check of readings. It is not clearance for the task."]), notMeasured: NOT_MEASURED };
  }
  root.TASKS = { checkTask: checkTask, NOT_MEASURED: NOT_MEASURED };
})(typeof window !== "undefined" ? window : globalThis);
