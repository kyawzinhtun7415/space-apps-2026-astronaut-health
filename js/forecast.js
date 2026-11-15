// Forecasts: arithmetic on published averages and your own recent readings. Not a simulation of your body.
(function (root) {
  // NASA: weight-bearing bones lose 1% to 1.5% of density each month on four-to-six-month missions.
  function bone(months) {
    var m = Math.max(0, months);
    return { low: Math.round((100 - 1.5 * m) * 10) / 10, high: Math.round((100 - 1.0 * m) * 10) / 10 };
  }
  // Hours short of the nightly need over the nights given.
  function sleepDebt(nights, need) {
    need = need || 7;
    var debt = 0, under6 = 0;
    nights.forEach(function (h) { if (h < need) debt += need - h; if (h <= 6) under6++; });
    return { debt: Math.round(debt * 10) / 10, under6: under6, nights: nights.length, need: need };
  }
  // Where the study's average temperature shift would put this person on a given flight day.
  function tempRamp(day, baseline, shift, rampDays) {
    return Math.round((baseline + shift * Math.min(1, Math.max(0, day) / rampDays)) * 10) / 10;
  }
  root.FORECAST = { bone: bone, sleepDebt: sleepDebt, tempRamp: tempRamp };
})(typeof window !== "undefined" ? window : globalThis);
