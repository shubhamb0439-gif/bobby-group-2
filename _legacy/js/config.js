/*
  JOURNEY CONFIG — edit this file to change copy, timing and visuals.

  scrollLength : height of the scroll section in viewport heights (bigger = slower).
  scenes[]     : played in order. `share` = how much of the scroll each scene gets.
  transition   : how a scene hands over to the next one ("fade" | "wipe" | "clouds").
  frames       : null  -> uses the built-in drawn animation
                 {...} -> plays your own image sequence instead, e.g.
                 { dir: "frames/lift/", prefix: "frame_", pad: 3, ext: ".png", count: 120, start: 0, step: 1 }
                 loads frames/lift/frame_000.png ... frame_119.png
*/
window.JOURNEY = {
  scrollLength: 700,
  scenes: [
    {
      id: "lift",
      label: "Lift",
      share: 0.3,
      transition: "fade",
      frames: null,
      caption: {
        eyebrow: "01 — Inspected & loaded",
        title: "Checked before it moves.",
        body: "Every consignment is quality inspected for consistent standards before it leaves the warehouse."
      }
    },
    {
      id: "haul",
      label: "Haul",
      share: 0.24,
      transition: "wipe",
      frames: null,
      caption: {
        eyebrow: "02 — Bulk & packed",
        title: "Volume, packed your way.",
        body: "Supply at the volumes manufacturers need, in packaging tailored to your market."
      }
    },
    {
      id: "sail",
      label: "Sail",
      share: 0.26,
      transition: "clouds",
      frames: null,
      caption: {
        eyebrow: "03 — Global shipping",
        title: "From India to your port.",
        body: "Export shipments to importers and distributors in international markets."
      }
    },
    {
      id: "fly",
      label: "Fly",
      share: 0.2,
      transition: null,
      frames: null,
      caption: {
        eyebrow: "04 — On time",
        title: "Delivered when promised.",
        body: "Reliable, on-time delivery, backed by DGFT, FSSAI, APEDA and Spices Board registrations."
      }
    }
  ]
};
