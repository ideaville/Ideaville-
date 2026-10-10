import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportsDir = path.resolve(__dirname, "../exports");
const stillsDir = path.join(exportsDir, "stills");
const framesDir = process.env.FRAMES_DIR || "/tmp/ideaville-frames";
const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const stillsOnly = process.argv.includes("--stills");
const fps = 30;
const duration = 10;

const stills = [
  ["00-atmosphere", 1.0],
  ["01-headline", 3.4],
  ["02-band", 7.2],
  ["03-lockup", 9.7]
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--force-color-profile=srgb"]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const url = `file://${path.join(__dirname, "index.html")}?clean=1`;
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const fraunces = document.fonts.check("560 96px Fraunces");
    const outfit = document.fonts.check("600 22px Outfit");
    if (!fraunces || !outfit) {
      throw new Error(`fonts missing fraunces=${fraunces} outfit=${outfit}`);
    }
  });

  async function shoot(ms, file) {
    await page.evaluate((t) => window.__ad.seek(t), ms);
    await page.screenshot({ path: file, type: "png" });
  }

  await mkdir(stillsDir, { recursive: true });
  for (const [name, sec] of stills) {
    const file = path.join(stillsDir, `${name}.png`);
    await shoot(sec * 1000, file);
    console.log("still", file);
  }

  if (!stillsOnly) {
    await mkdir(framesDir, { recursive: true });
    const total = fps * duration;
    for (let i = 0; i < total; i++) {
      const file = path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`);
      await shoot((i / fps) * 1000, file);
      if (i % 30 === 0) console.log("frame", i);
    }
    const mp4 = path.join(exportsDir, "ideaville-10s.mp4");
    await run("ffmpeg", [
      "-y",
      "-framerate", String(fps),
      "-i", path.join(framesDir, "frame-%04d.png"),
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "16",
      "-preset", "medium",
      "-movflags", "+faststart",
      mp4
    ]);
    await run("ffmpeg", [
      "-y",
      "-i", path.join(stillsDir, "03-lockup.png"),
      "-update", "1",
      path.join(exportsDir, "poster.png")
    ]);
    console.log("wrote", mp4);
  }
} finally {
  await browser.close();
}
