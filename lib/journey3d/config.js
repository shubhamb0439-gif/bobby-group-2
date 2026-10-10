/*
  3D JOURNEY CONFIG — copy and pacing for the scroll story.

  scrollLength : height of the scroll section in viewport heights (bigger = slower).
  chapters[]   : caption cards + rail steps. `from` / `to` are scroll progress (0..1)
                 at which each chapter's caption is shown. The 3D choreography itself
                 (crane, truck, ship, plane) lives in lib/journey3d/engine.js.
*/
/* bump when any model or journey texture changes: assets are cached for 30 days, the version
   in the URL is what makes browsers fetch the new file */
export const ASSET_VERSION = 6;
/* fetched first: everything the opening (yard) scenes need */
export const YARD_MODELS = ["containers", "crane", "truck", "trailer"];

export const JOURNEY3D = {
  scrollLength: 1100,
  chapters: [
    {
      id: "lift",
      label: "Lift",
      from: 0.0,
      to: 0.43,
      caption: {
        eyebrow: "01 — Inspected & loaded",
        title: "Checked before it moves.",
        body: "Every consignment is quality inspected for consistent standards before it leaves the warehouse.",
      },
    },
    {
      id: "haul",
      label: "Haul",
      from: 0.43,
      to: 0.76,
      caption: {
        eyebrow: "02 — Bulk & packed",
        title: "Volume, packed your way.",
        body: "Supply at the volumes manufacturers need, in packaging tailored to your market.",
      },
    },
    {
      id: "sail",
      label: "Sail",
      from: 0.76,
      to: 0.91,
      caption: {
        eyebrow: "03 — Global shipping",
        title: "From India to your port.",
        body: "Export shipments to importers and distributors in international markets.",
      },
    },
    {
      id: "fly",
      label: "Fly",
      from: 0.91,
      to: 1.0,
      caption: {
        eyebrow: "04 — On time",
        title: "Delivered when promised.",
        body: "Reliable, on-time delivery, backed by DGFT, FSSAI, APEDA and Spices Board registrations.",
      },
    },
  ],
};

/* Credits required by the CC licences of the 3D models (shown in the footer). */
export const MODEL_CREDITS = [
  { title: "40ft ISO General Container [Free Asset Pack]", author: "Lex713", url: "https://sketchfab.com/3d-models/40ft-iso-general-container-free-asset-pack-92bf3d3d7ebc45ada55d46637b9b7586", license: "CC BY 4.0" },
  { title: "VOLVO FH 16", author: "liebherr996litronic", url: "https://sketchfab.com/3d-models/volvo-fh-16-a7c5155c857949548a9687a617702c23", license: "CC BY 4.0" },
  { title: "Container Trailer Chassis", author: "fabio.ardito", url: "https://sketchfab.com/3d-models/container-trailer-chassis-4179e400ef464b958bcf8416e11f87df", license: "CC BY-SA 4.0" },
  { title: "Boeing 787-9", author: "mudkipz321", url: "https://sketchfab.com/3d-models/boeing-787-9-singapore-airlines-d383b7e3b858407e8cff7365820cc4dd", license: "CC BY 4.0" },
  { title: "Container ship at sea (photo)", author: "Bent Van Aeken", url: "https://unsplash.com/photos/an-aerial-view-of-a-cargo-ship-in-the-ocean-0A7YwYhZhWw", license: "Unsplash License" },
];
