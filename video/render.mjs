// Rendu image par image : Chromium affiche index.html à l'instant t, on
// capture, ffmpeg assemble. Déterministe : aucune animation CSS ni horloge.
//
//   node render.mjs <dossier de build> [--stills t1,t2,…]
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const build = process.argv[2];
const stillsArg = process.argv.indexOf("--stills");
const FPS = 30;
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const tl = JSON.parse(readFileSync(path.join(build, "timeline.json"), "utf8"));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ["--allow-file-access-from-files", "--force-color-profile=srgb"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "index.html")).href);
await page.evaluate(async (t) => { await document.fonts.ready; window.setup(t); }, tl);
await page.evaluate(() => document.fonts.ready);

if (stillsArg > 0) {
  const dir = path.join(build, "stills");
  mkdirSync(dir, { recursive: true });
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const out = path.join(build, "frames.mp4");
const ff = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out], { stdio: ["pipe", "inherit", "inherit"] });
const total = Math.round(tl.duration * FPS);
const started = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.renderAt(t), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 150 === 0) console.log(`image ${f}/${total} · ${((Date.now() - started) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("→", out);
