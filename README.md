# EMT Human Atlas

A modern 3D anatomy and EMS patient-scenario simulator for EMT practice.

## What is included

- Interactive BodyParts3D adult male anatomy with 2,234 individually selectable meshes and 15 anatomical systems.
- Search, layer toggles, isolate mode, orbit/zoom, front/side/back views, and exploded anatomy.
- Scenario engine with accelerated time, changing vital signs, anatomy hotspots, scoring, and debriefs.
- Medical, trauma, resuscitation, neurologic, respiratory, environmental, and endocrine practice cases.
- Searchable ambulance inventory covering common BLS assessment, airway, breathing, circulation, trauma, medication, transport, and PPE equipment, with ALS/protocol-dependent items clearly marked.
- Tool-to-body interaction: select equipment such as a stethoscope, tourniquet, chest seal, splint, AED, suction, or penlight and target the relevant anatomy.
- Medication decision practice that intentionally avoids presenting one jurisdiction's dosing rules as universal.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Build production assets with:

```bash
npm run build
```

## Anatomy model

This app loads the browser-optimized BodyParts3D model manifest and geometry from the open-source [Human Atlas](https://github.com/ashemag/human-atlas) project at runtime. Human Atlas application code is MIT licensed. BodyParts3D anatomy data is licensed CC BY 4.0 and remains attributed in `public/ATTRIBUTION.md` and in the in-app Source & Safety panel.

The underlying anatomy is an adult male reference and does not represent every human anatomical structure or variation.

## Safety / training scope

This project is an educational simulator, not medical direction, clinical decision support, or a substitute for hands-on skills verification. EMS scope, medication indications/contraindications/doses, procedures, destination criteria, termination rules, and standing orders vary by jurisdiction, agency, provider level, and medical director. Local protocol and medical direction always control real patient care.

## Deployment

The included GitHub Actions workflow builds the Vite app and deploys it to GitHub Pages on pushes to `main`. `vercel.json` also supports Vercel deployment.
