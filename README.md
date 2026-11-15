# Astronaut health self-check (concept prototype)

A one-page web prototype for the NASA Space Apps Challenge 2026 challenge "Create Health Monitoring Software for Astronauts on Space Missions".

It shows how a crew member far from Earth could judge a health reading alone. Each reading is compared three ways: with the crew member's own pre-launch baseline, with what small studies measured in space, and with a published clinical chart. Then it says in plain words what to do and who to tell.

**Concept prototype with simulated data. It does not detect disease or clear anyone for a task. Not a medical device.**

## What is in it

- A body figure with clickable regions, and the same regions as a plain list.
- Six readings: blood pressure, heart rate, core temperature, sleep, blood sugar and mood.
- Five sample days for one made-up crew member, including a fever on top of the space shift and a dead sensor.
- A form to type in your own readings. They stay in your browser.
- A 7-day trend per reading (simulated).
- A readings check before a task, and a symptom box that overrides the readings.
- A look-ahead: arithmetic on published averages, not a simulation of a body.
- NASA's five hazards of human spaceflight, with links to NASA's pages.

## What is ours and what is not

The reference numbers come from the sources below. The cut-offs for "expected in space", the act-now lines for pulse and low blood sugar, the task check, the symptom list and the "who to tell" steps are examples by this team. They are not NASA's rules and not medical advice. Score bands are quoted from the NEWS2 chart; this tool does not reproduce that chart or calculate a NEWS2 total.

## Run it

Open `index.html` in a browser. There is no build step, no server and no login.

To run the logic tests (Node 18 or newer):

    node --test tests/logic.test.js

## Sources

NASA Human Research Program:

- 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- Hazard pages: https://www.nasa.gov/hrp/hazard-space-radiation/ , https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ , https://www.nasa.gov/hrp/hazard-distance-from-earth/ , https://www.nasa.gov/hrp/hazard-gravity-fields/ , https://www.nasa.gov/hrp/hazard-hostile-closed-environments/
- Risk from Inadequate Sleep and Irregular Schedules: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/
- Risk of Cardiovascular Adaptations: https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
- Risk of Altered Immune System Responses: https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
- Risk of Inadequate Food and Nutrition: https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/
- Risk of Spaceflight-Induced Bone Changes: https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/
- Risk of Spaceflight Associated Neuro-ocular Syndrome: https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/
- ARCHeR study: https://www.nasa.gov/reference/archer/
- NASA OCHMO-TB-041 Rev B, sleep accommodations: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf

Other sources:

- Norsk et al. 2015, blood pressure in flight: https://pmc.ncbi.nlm.nih.gov/articles/PMC4324706/
- Stahn et al. 2017, core temperature in flight: https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078/
- Royal College of Physicians, NEWS2 scoring chart: https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf
- NIH MedlinePlus, high blood pressure: https://medlineplus.gov/highbloodpressure.html
- NIH MedlinePlus, pulse: https://medlineplus.gov/ency/article/003399.htm
- American Diabetes Association, diagnosis: https://diabetes.org/about-diabetes/diagnosis
- American Diabetes Association, low blood glucose: https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
- US CDC, about sleep: https://www.cdc.gov/sleep/about/index.html
- Canadian Space Agency, Bio-Monitor: https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
- Axiom Space release, 26 Sep 2025: https://axiomspace.com/release/suite-ride-research-unlocks-potential-for-first-astronaut-with-diabetes

## Use of AI

This prototype was built with help from Claude (Anthropic). Claude helped brainstorm, research sources, write the code and tests, and review them. The team chose the idea and owns the rules.
