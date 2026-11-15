// NASA's five hazards and the NASA risk page behind each body region. Wording follows NASA's Human Research Program pages.
(function (root) {
  root.HAZARDS = {
    radiation: { name: "Space radiation", line: "Invisible to the human eye, and considered one of the most hazardous aspects of spaceflight.",
      url: "https://www.nasa.gov/hrp/hazard-space-radiation/", note: "No reading in this prototype measures radiation dose." },
    isolation: { name: "Isolation and confinement", line: "Behavioral responses occur among groups of people far from Earth who are isolated and confined in a small space over a long period of time.",
      url: "https://www.nasa.gov/hrp/hazard-isolation-and-confinement/" },
    distance: { name: "Distance from Earth", line: "Medical care and supplies become harder to receive from Earth, with a communication delay of up to 20 minutes one way at Mars.",
      url: "https://www.nasa.gov/hrp/hazard-distance-from-earth/" },
    gravity: { name: "Gravity fields", line: "Muscles, bones, inner ear and organs must adjust to each new gravity.",
      url: "https://www.nasa.gov/hrp/hazard-gravity-fields/" },
    closed: { name: "Hostile and closed environments", line: "Keeping a safe ecosystem inside a spacecraft includes temperature, pressure, lighting, noise, microbes and tracking immune responses.",
      url: "https://www.nasa.gov/hrp/hazard-hostile-closed-environments/" }
  };
  // One NASA risk page per region, with one fact from that page.
  root.REGION_RISKS = {
    head: { name: "Risk from Inadequate Sleep and Irregular Schedules",
      fact: "Crews on the station see 16 sunrises and sunsets a day, which can disrupt the sleep-wake cycle.",
      helps: "On the station, LED lighting follows Earth's light-dark cycle, researchers watch light and caffeine use, and crews get set times for relaxation.",
      url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" },
    chest: { name: "Risk of Cardiovascular Adaptations",
      fact: "Low gravity can alter the heart and blood vessels, and low blood pressure raises the chance of fainting at landing.",
      helps: "Regular exercise and a healthy diet help keep the heart fit. Compression garments and plenty of fluids before landing help prevent low blood pressure.",
      url: "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/" },
    core: { name: "Risk of Altered Immune System Responses",
      fact: "Spaceflight stressors can alter the immune system, and some station astronauts have reported rashes and infections.",
      helps: "NASA tracks immune changes with blood, saliva and urine samples. That page gives no crew action, so a raised temperature goes to the steps above.",
      url: "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/" },
    arm: { name: "Risk of Inadequate Food and Nutrition",
      fact: "Keeping bodies and minds healthy in flight requires adequate nutrition, and meals must last a long mission.",
      helps: "NASA is improving the space food system with more variety and better nutrition for long missions.",
      url: "https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/" }
  };
  // Changes NASA describes that this prototype does not measure. Shown so the gaps are plain.
  root.NOT_MEASURED_RISKS = [
    { name: "Bones", fact: "Weight-bearing bones lose 1% to 1.5% of their density each month on four-to-six-month missions.",
      url: "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/" },
    { name: "Eyes", fact: "About 70 percent of station astronauts get some swelling at the back of the eye.",
      url: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/" }
  ];
  // Daily habits that NASA's own pages say protect crews. Each line is NASA's point in plain words, with its page.
  root.HABITS = [
    { id: "exercise", text: "Exercise: resistance and aerobic", why: "Station crews exercise 1.5 hours a day to keep fitness and protect against muscle and bone loss.",
      source: { name: "NASA, Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness", url: "https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/" } },
    { id: "light", text: "Keep to the day and night lighting schedule", why: "On the station, lighting follows Earth's light-dark cycle to help crews sleep.",
      source: { name: "NASA, Risk from Inadequate Sleep and Irregular Schedules", url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" } },
    { id: "relax", text: "Take your relaxation and self-care time", why: "Crews get set times for relaxation and self-care to help prevent burnout.",
      source: { name: "NASA, Risk from Inadequate Sleep and Irregular Schedules", url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" } },
    { id: "journal", text: "Write in your journal", why: "NASA encourages self-care options, including keeping a regular journal.",
      source: { name: "NASA, Risk of Behavioral Conditions and Psychiatric Disorders", url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/" } },
    { id: "diet", text: "Eat a varied, healthy diet", why: "Regular exercise and healthy diets help crews maintain cardiovascular fitness.",
      source: { name: "NASA, Risk of Cardiovascular Adaptations", url: "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/" } }
  ];
})(typeof window !== "undefined" ? window : globalThis);
