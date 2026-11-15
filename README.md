# Astronaut Health Twin (concept prototype)

A one-page web prototype for the NASA Space Apps Challenge 2026 challenge "Create Health Monitoring Software for Astronauts on Space Missions".

It shows how a crew member far from Earth could judge their own health readings alone. Each reading is compared three ways: with the crew member's own pre-launch baseline, with what small studies measured in space, and with a published clinical chart. Then the tool says how you are doing today, what changed, what to do now and who to tell.

**Concept prototype with simulated data. It does not detect disease or clear anyone for a task. Not a medical device.**

## What is in it

- **Today: how you are doing.** One headline, each reading at a glance (high, low, up, down, expected, OK, no reading), and notes on what changed in the last 7 days.
- **Body-centred overview.** The first screen puts the six readings and selected comparison on the left, the body in the centre, and the ordered plan on the right. A fresh load opens simulated flight day 92. The other sample days and typed readings remain available.
- **What to do now.** Steps appear soonest first. On day 92, telling the crew medical officer now comes before holding exercise and re-checking. Each step says whether it is the team's own example or rests on a named source; the full evidence is available below the overview.
- A symptom box that overrides the readings.
- A body illustration made with OpenAI image generation, with live, keyboard-accessible region buttons. The picture has no baked-in status markers; the controls show the current assessment.
- An optional **Rotate in 3D** view with a smooth, generic CC0 human mesh and four selectable regions, rendered with the local three.js library. Drag to rotate. The illustration and region list remain available without WebGL, and a flat figure is retained as a fallback.
- Six readings: blood pressure, heart rate, core temperature, sleep, blood sugar and mood.
- Five sample days for one made-up crew member, including a fever on top of the space shift and a dead sensor.
- A form to type in your own readings and your own baseline. They stay in your browser.
- A 7-day trend per reading (simulated).
- A readings check before a task. It never says anyone is fit or cleared.
- A look-ahead: arithmetic on published averages, not a simulation of a body.
- Daily habits taken from NASA's own pages, with tick boxes.
- An environment read automatically from the simulated mission plan, with a manual correction. It changes the evidence context and report, not the clinical rules.
- Measurement prompts derived from the action plan, with automatic re-check reminders. The labelled demonstration runs one mission minute per second while the page is open.
- Check streaks and badges that reward logging readings and habits, not getting a particular health result.
- Measurement information and a treatment section that groups the existing plan by what the crew member can do and what goes to the medical officer. It adds no medicine advice.
- An optional local photo preview. The photo stays in the tab; its filename is listed in the report, but the image is not analysed or sent.
- A report for Earth that says everything in one go, because a reply can take up to 20 minutes one way.
- NASA's five hazards of human spaceflight, with links to NASA's pages.

The lower health toolkit retains the full reading details, source links, action evidence, task checks, forecast, habits, prompts, environment, photo and report controls. The overview is a display layer over the existing assessments and actions; the body illustration and mesh do not infer measurements or make health decisions.

## What is ours and what is not

The reference numbers come from the sources below. The summary wording, the pattern notes, the cut-offs for "expected in space", the act-now lines for pulse and low blood sugar, the task check, the symptom list and the steps for what to do and who to tell are examples by this team. They are not NASA's rules and not medical advice. Score bands are quoted from the NEWS2 chart; this tool does not reproduce that chart or calculate a NEWS2 total.

## Run it

Open `index.html` in a browser. There is no build step, no server and no login.

All scripts and visual assets are local. A static HTTP preview also works; no backend or runtime API is required. Direct-file launch has not been rechecked in this visual-update pass.

To run the logic tests (Node 18 or newer):

    node --test tests/logic.test.js tests/extras.test.js

The latest local run on 15 Nov 2026 passed all 69 tests. These check the prototype's logic and extras; they do not establish clinical validity or replace browser interaction checks.

## Body assets

The default `assets/body-neutral.png` is an AI-generated illustration. The optional 3D view uses static geometry from Innerscene's male base mesh, adapted from MakeHuman CC0 assets. It is a generic model, not a reconstruction of the sample crew member. The geometry is stored in `vendor/human-mesh-data.js`; its rig and textures are not used. The renderer adds the material, region markers and drag interaction.

Source, licence, transformation details and image provenance are recorded in [assets/PROVENANCE.md](assets/PROVENANCE.md). three.js r160 remains bundled under the MIT licence in `vendor/three-LICENSE.txt`.

## Sources

NASA Human Research Program:

- 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Hazard pages: https://www.nasa.gov/hrp/hazard-space-radiation/ , https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ , https://www.nasa.gov/hrp/hazard-distance-from-earth/ , https://www.nasa.gov/hrp/hazard-gravity-fields/ , https://www.nasa.gov/hrp/hazard-hostile-closed-environments/
- Risk from Inadequate Sleep and Irregular Schedules: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/
- Risk of Cardiovascular Adaptations: https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
- Risk of Altered Immune System Responses: https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
- Risk of Inadequate Food and Nutrition: https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/
- Risk of Behavioral Conditions and Psychiatric Disorders: https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/
- Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness: https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/
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
- three.js r160, the library that draws the 3D figure (MIT licence, copy in `vendor/`): https://github.com/mrdoob/three.js
- Innerscene male base mesh, adapted from MakeHuman CC0 assets, used for the optional rotating body: https://www.innerscene.com/tools/library/3d-parts/male-base-mesh-3d-person-rigged-a-pose-380e6d89

## Related NASA work

This prototype builds on a problem NASA has worked on for years. It does not claim to be the first.

- Medical Data Architecture, led from NASA Ames: ground prototypes of a system to give the crew actionable medical information without ground support. https://ntrs.nasa.gov/citations/20200000568
- Autonomous Medical Operations: a project for an on-board Medical Decision Support System, now listed by NASA as archived. https://www.nasa.gov/directorates/stmd/game-changing-development-program/autonomous-medical-operations-amo/
- Clinical decision support concept of operations, NASA Exploration Medical Capability: an on-board system to help the crew medical officer, and crew who are not medical experts, assess and respond to health problems. https://ntrs.nasa.gov/citations/20220017856

That work covers decision support for the medical officer and for non-expert crew, and joining up medical data. What we found published is at the concept, requirements and ground prototype stage. This prototype is a small working demonstration of one crew-facing part, for routine readings: three checks on every reading, a plain summary and an ordered plan.

## Use of AI

This prototype was built with help from Claude (Anthropic) and Codex (OpenAI). Claude helped brainstorm, research sources, write the original prototype and tests, review them, and add the environment, measurement-reminder and other toolkit features. Codex helped create and review visual alternatives, implement the entrant-selected body-centred overview, integrate the optional rotating human mesh, and check that existing controls and rules remained connected. OpenAI's built-in image generation made the visual mockups and the body illustration; the page visibly credits the illustration. The team chose the idea and the visual direction, and owns the example rules.
