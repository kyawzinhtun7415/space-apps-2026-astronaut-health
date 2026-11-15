# Body visual assets

## Main body view

`body-neutral.png` was generated with OpenAI's built-in image tool on 15 Nov 2026 from the entrant-selected body-centred concept. It is an illustration, not a medical scan or a 3D mesh. No status markers or text are baked in; browser controls show current assessment statuses separately. The prompt is saved in the private project at `submission/visual-concepts-2026-11-15/BODY-ASSET-PROMPT.md`.

## Rotate in 3D

`../vendor/human-mesh-data.js` contains static geometry extracted from:

- Source: https://www.innerscene.com/tools/library/3d-parts/male-base-mesh-3d-person-rigged-a-pose-380e6d89
- Creator: Innerscene, adapted from MakeHuman CC0 assets.
- License: CC0 / public domain. Source explicitly permits use, modification and redistribution, including commercially.
- Download: https://www.innerscene.com/api/library/male-base-mesh-3d-person-rigged-a-pose-380e6d89/download
- Original GLB: 4,498,248 bytes. Downloaded and source page opened 15 Nov 2026.
- Transformation: extracted mesh 0 primitive 0 positions and indices; omitted rig, textures, UVs and accessories. Normals recomputed by three.js; cyan holographic material and drag rotation added.
- Geometry: 63,750 vertices, 96,224 triangles; about 1.79 MB of local script data.

This is a generic body model, not a reconstruction of the sample crew member. No physiological measurement is inferred from its geometry.

three.js r160 is MIT licensed; license in `../vendor/three-LICENSE.txt`.
