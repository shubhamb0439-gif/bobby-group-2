// Renders the 3D journey into a WebP image sequence for the scroll player.
//   1. npm run build && npx next start -p 3123   (renders from the /render-journey page)
//   2. node scripts/render-frames.cjs desktop   (1600x900)
//      node scripts/render-frames.cjs mobile    (720x1280)
// Needs puppeteer-core (npm i -D puppeteer-core) and Google Chrome. Frames are rendered in
// batches, restarting the browser between them so long renders don't exhaust GPU memory.
// Re-running skips frames that already exist (delete a folder to re-render it).
const fs = require("fs");
const path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer-core");

const SETS = { desktop: { w: 1600, h: 900 }, mobile: { w: 720, h: 1280 } };
const set = process.argv[2] || "desktop";
const { w, h } = SETS[set];
const N = +(process.env.FRAMES || 360), BATCH = +(process.env.BATCH || 40);
const out = path.join(__dirname, "..", "public", "frames", set);
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = process.env.URL || "http://localhost:3123/render-journey?render3d";
fs.mkdirSync(out, { recursive: true });
const name = (i) => path.join(out, `f${String(i).padStart(3, "0")}.webp`);

(async () => {
  const todo = [...Array(N).keys()].filter((i) => !fs.existsSync(name(i)));
  console.log(`${set}: ${N - todo.length} done, ${todo.length} to render at ${w}x${h}`);
  for (let b = 0; b < todo.length; b += BATCH) {
    const chunk = todo.slice(b, b + BATCH);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--ignore-gpu-blocklist"] });
    try {
      const pg = await browser.newPage();
      await pg.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await pg.goto(URL, { waitUntil: "load", timeout: 180000 });
      await pg.waitForFunction(() => window.__journey && window.__journey.ready, { timeout: 300000, polling: 250 });
      await pg.evaluate(() => window.__journey.loadSea());
      await pg.waitForFunction(() => window.__journey.seaReady, { timeout: 300000, polling: 250 });
      for (const i of chunk) {
        const url = await pg.evaluate((p) => window.__journey.renderFrame(p), i / (N - 1));
        // render twice on the first frame of a batch: shaders compile on first use
        const data = i === chunk[0] ? await pg.evaluate((p) => window.__journey.renderFrame(p), i / (N - 1)) : url;
        fs.writeFileSync(name(i), Buffer.from(data.split(",")[1], "base64"));
      }
      console.log(`  frames ${chunk[0]}-${chunk[chunk.length - 1]} ok`);
    } catch (e) {
      console.log(`  batch from ${chunk[0]} failed: ${e.message.slice(0, 120)} (re-run to resume)`);
    } finally {
      await browser.close();
    }
  }
})();
