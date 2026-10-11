import { SITE_URL } from "@/lib/site";

export default function robots() {
  return {
    // /render-journey is intentionally NOT disallowed here: it already sends
    // `noindex` via its own metadata, and blocking it would stop crawlers from
    // ever reading that directive.
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
