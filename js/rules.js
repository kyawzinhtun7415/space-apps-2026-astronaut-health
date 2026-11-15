// Example rules written by this team. They are NOT NASA's rules and not medical advice.
(function (root) {
  root.RULES = {
    // ---------------------------------------------------------------------------
    // TODO (you, as the team's medic): these are working defaults. Set your own.
    // shiftTolerance: how far from the measured space shift still counts as "expected in space".
    // baselineChange: how far from the pre-launch baseline counts as "changed from your baseline".
    shiftTolerance: { bp: 4, temp: 0.25 },
    baselineChange: { bp: 15, hr: 15, temp: 0.5, sleep: 1.5, glucose: 20, mood: 2 },
    recheckMinutes: { bp: 30, hr: 30, temp: 60, glucose: 15 },
    // Insight rules. fastChange: a move this big in two days is called out. persistDays: flagged on this many of the last 7 days.
    fastChange: { bp: 10, hr: 15, temp: 0.5, sleep: 1.5, glucose: 20, mood: 2 },
    persistDays: 5,
    togetherCount: 3,           // this many readings moving on the same day is called out
    lowMood: 2,                 // mood at or below this adds a mood step to the plan

    // This team's own "act now" lines, for values the published references above do not grade.
    // They are examples, not from a chart. Set to null to switch one off.
    teamActNow: { hrAbove: 130, hrBelow: 40, glucoseBelow: 54 },
    // Mood has no clinical chart. At or below this, on the team's own 1 to 5 scale, it counts as needing attention.
    moodAttentionAtOrBelow: 1,

    // Which readings each task looks at. exertion: true means a raised core temperature holds the task.
    tasks: [
      { id: "eva", name: "Spacewalk", needs: ["bp", "hr", "temp", "sleep", "glucose"], exertion: true, sleepHoldBelow: 7 },
      { id: "exercise", name: "Exercise session", needs: ["bp", "hr", "temp"], exertion: true },
      { id: "cabin", name: "Routine cabin work", needs: ["sleep", "mood"], exertion: false }
    ],
    tempTightensExertion: true,   // hold exertion when core temperature is flagged, or raised beyond what the space shift explains
    tempRiseForExertion: 0.5,     // °C above your own baseline that counts as raised
    sleepHoldBelow: 6,            // a task waits when last night was under this many hours (a spacewalk uses its own stricter line above)

    // Symptoms that go straight to the crew medical officer, whatever the readings say.
    redFlags: ["Chest pain", "Trouble breathing", "Fainting or near fainting", "Sudden change in vision", "New confusion"],
    // ---------------------------------------------------------------------------

    // Who is told, by seriousness. Example escalation by this team.
    whoToTell: function (status, key, value, score) {
      if (status === "cannot") return { who: "You", text: "Cannot assess. Check the sensor, then take this reading by hand." };
      if (status === "serious") return { who: "Crew medical officer now, and the flight surgeon on Earth",
        text: "Tell the crew medical officer now and send the reading to the flight surgeon on Earth. On a Mars mission a reply can take up to 20 minutes one way (NASA), so do not wait for it." };
      if (key === "glucose" && value !== null && value < 70) {
        return { who: "You, then the crew medical officer",
          text: "Follow the 15/15 rule: 15 g of fast-acting carbohydrate, then check again after 15 minutes (American Diabetes Association). Tell the crew medical officer if it is still low." };
      }
      if (status === "watch" && key === "sleep") return { who: "You, then the crew medical officer",
        text: "Last night cannot be re-checked. Plan a longer sleep tonight and log it again tomorrow. Tell the crew medical officer if short nights continue." };
      if (status === "watch" && key === "mood") return { who: "Crew medical officer or a crew mate today",
        text: "Talk to the crew medical officer or a crew mate today about how you are feeling." };
      if (status === "watch" && score === 2) return { who: "Crew medical officer now",
        text: "This is clearly outside the normal range. Tell the crew medical officer now, and re-check in " + (this.recheckMinutes[key] || 30) + " minutes." };
      if (status === "watch") {
        var m = this.recheckMinutes[key];
        return { who: "You, then the crew medical officer",
          text: (m ? "Re-check in " + m + " minutes. " : "Log it again tomorrow. ") + "Tell the crew medical officer if it is still flagged, or sooner if you feel unwell." };
      }
      if (status === "changed") return { who: "You", text: "Not flagged by the clinical charts, but away from your own baseline. Re-check, and mention it at the next crew health check." };
      if (status === "expected") return { who: "No one yet", text: "No action from these readings. A small flight study saw a similar change. That is context, not an all-clear. If you feel unwell, tell the crew medical officer." };
      return { who: "No one yet", text: "No action from these readings." };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
