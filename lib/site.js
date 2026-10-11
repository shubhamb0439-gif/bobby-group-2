/* Single source of truth for absolute URLs used by metadata, sitemap, robots and JSON-LD.
   Override per environment with NEXT_PUBLIC_SITE_URL (e.g. the Vercel preview domain). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.bobbygroup.in"
).replace(/\/$/, "");

export const SITE_NAME = "Bobby Group";

export const ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms-conditions", priority: 0.3, changeFrequency: "yearly" },
  { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookie-policy", priority: 0.3, changeFrequency: "yearly" },
];
