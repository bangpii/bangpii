#!/usr/bin/env node

// Bake an elegant frame into the gallery screenshots.
//
// GitHub's markdown sanitiser keeps the style attribute but filters the CSS
// properties down to a small allowlist, so border / border-radius / box-shadow
// on an <img> are dropped. The only way to get a real frame is to put it in the
// pixels, so the frame lives in the image itself.
//
// Always baked from the pristine copies in assets/projects/.source, which makes
// re-running safe: frames can never stack up, no pixel probing required.

import { execFileSync } from "node:child_process";
import { readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRAME = 5; // px at natural resolution, reads as ~1.5px in the gallery
const RADIUS = 14; // px, echoes the hero banner's 12-18px corners
const COLOR = { r: 138, g: 148, b: 166 }; // #8A94A6, neutral so it reads on light and dark
const QUALITY = 82;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(repoRoot, "assets", "projects");
const sourceDir = join(outputDir, ".source");

const magick = (args) => execFileSync("magick", args, { encoding: "utf8" });

const size = (file) => {
  const [width, height] = magick(["identify", "-format", "%w %h", file]).trim().split(/\s+/);
  return { width: Number(width), height: Number(height) };
};

const frame = (source, target) => {
  const { width, height } = size(source);
  const padded = `${target}.pad.png`;
  const mask = `${target}.mask.png`;
  const framed = `${target}.framed.webp`;
  const outerWidth = width + FRAME * 2;
  const outerHeight = height + FRAME * 2;

  magick([source, "-bordercolor", `rgb(${COLOR.r},${COLOR.g},${COLOR.b})`, "-border", String(FRAME), padded]);
  magick([
    "-size", `${outerWidth}x${outerHeight}`,
    "xc:none",
    "-fill", "white",
    "-draw", `roundrectangle 0,0,${outerWidth - 1},${outerHeight - 1},${RADIUS},${RADIUS}`,
    "-alpha", "extract",
    mask
  ]);
  magick([padded, mask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-quality", String(QUALITY), "-define", "webp:method=6", framed]);

  renameSync(framed, target);
  for (const temp of [padded, mask]) {
    try { unlinkSync(temp); } catch { /* already gone */ }
  }

  return { source: { width, height }, framed: size(target) };
};

const targets = process.argv.slice(2);
const names = targets.length > 0
  ? targets.map((t) => basename(t))
  : readdirSync(sourceDir).filter((f) => f.endsWith(".webp"));

console.log(`Framing ${names.length} gallery image(s): frame=${FRAME}px radius=${RADIUS}px colour=rgb(${COLOR.r},${COLOR.g},${COLOR.b})`);

for (const name of names) {
  const result = frame(join(sourceDir, name), join(outputDir, name));
  const { source, framed } = result;
  const grew = framed.width === source.width + FRAME * 2 && framed.height === source.height + FRAME * 2;
  console.log(
    `  ${name.padEnd(26)} ${source.width}x${source.height} -> ${framed.width}x${framed.height}` +
    `  ${String(Math.round(statSync(join(outputDir, name)).size / 1024)).padStart(4)}KB` +
    `  ${grew ? "ok" : "DIMENSI TIDAK SESUAI"}`
  );
}
