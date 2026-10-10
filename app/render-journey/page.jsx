import Journey3D from "@/components/Journey3D";

/* Live 3D journey, used only to render the image sequence (scripts/render-frames.cjs) and to
   preview scene changes before re-rendering. Not linked anywhere and not indexed. */
export const metadata = { title: "Journey render", robots: { index: false, follow: false } };

export default function RenderJourney() {
  return <Journey3D />;
}
