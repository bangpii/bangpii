#!/usr/bin/env node

// Adds a subtle animated constellation behind the contribution snake.
//
// The background is injected into the SVG file itself rather than the README,
// because GitHub strips <style> and <script> from markdown but happily serves
// SVG files, and CSS animations declared inside an SVG file keep running.
//
// Star positions come from a fixed seed, so re-running this on a freshly
// generated snake produces a byte-identical background. The only daily diff is
// the snake itself.

import { readFile, writeFile } from "node:fs/promises";

const START = "<!-- constellation:start -->";
const END = "<!-- constellation:end -->";

const VARIANTS = {
  "snake-dark.svg": {
    seed: 0x5eed,
    starCount: 96,
    tones: ["#22D3EE", "#38BDF8", "#7DD3FC", "#2DD4BF"],
    lineTone: "#22D3EE",
    maxLinks: 30,
    linkDistance: 92,
    drift: "104px -58px",
  },
  "snake-light.svg": {
    seed: 0xc0ffee,
    starCount: 96,
    tones: ["#7C3AED", "#A78BFA", "#6366F1", "#8B5CF6"],
    lineTone: "#7C3AED",
    maxLinks: 30,
    linkDistance: 92,
    drift: "104px -58px",
  },
};

// deterministic PRNG so the background never churns between runs
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value) => Math.round(value * 100) / 100;

function buildConstellation({ seed, starCount, tones, lineTone, maxLinks, linkDistance, drift }, view) {
  const random = mulberry32(seed);
  const stars = [];

  for (let index = 0; index < starCount; index += 1) {
    stars.push({
      x: round(view.x + random() * view.width),
      y: round(view.y + random() * view.height),
      r: round(0.5 + random() * 1.15),
      tone: tones[Math.floor(random() * tones.length)],
      min: round(0.06 + random() * 0.1),
      max: round(0.34 + random() * 0.46),
      duration: round(2.6 + random() * 4.4),
      delay: round(random() * -6),
      twinkle: Math.floor(random() * 2) === 0,
    });
  }

  // link each star to its closest neighbour, closest pairs first, so the
  // network reads as clusters instead of an even mesh
  const pairs = [];
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      const distance = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
      if (distance <= linkDistance) pairs.push({ i, j, distance });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance);
  const used = new Set();
  const links = [];
  for (const pair of pairs) {
    if (links.length >= maxLinks) break;
    if (used.has(pair.i) || used.has(pair.j)) continue;
    used.add(pair.i);
    used.add(pair.j);
    links.push(pair);
  }

  const lines = links
    .map(
      (link) =>
        `      <line class="sf-link" x1="${stars[link.i].x}" y1="${stars[link.i].y}" x2="${stars[link.j].x}" y2="${stars[link.j].y}" style="--sf-line:${round(0.05 + (1 - link.distance / linkDistance) * 0.14)}"/>`,
    )
    .join("\n");

  const dots = stars
    .map(
      (star) =>
        `      <circle class="sf-star" cx="${star.x}" cy="${star.y}" r="${star.r}" fill="${star.tone}" style="--sf-min:${star.min};--sf-max:${star.max};--sf-duration:${star.duration}s;--sf-delay:${star.delay}s${star.twinkle ? ";--sf-scale:1.55" : ""}"/>`,
    )
    .join("\n");

  return `${START}
  <style>
    .sf-star { animation: sf-breathe var(--sf-duration) ease-in-out infinite alternate; animation-delay: var(--sf-delay); transform-box: fill-box; transform-origin: center; }
    .sf-star[style*="--sf-scale"] { animation-name: sf-sparkle; }
    .sf-link { stroke: ${lineTone}; stroke-width: 0.6; stroke-opacity: var(--sf-line); }
    .sf-field { animation: sf-drift 96s ease-in-out infinite alternate; }
    @keyframes sf-breathe { from { opacity: var(--sf-min); } to { opacity: var(--sf-max); } }
    @keyframes sf-sparkle {
      0% { opacity: var(--sf-min); transform: scale(1); }
      50% { opacity: var(--sf-max); transform: scale(var(--sf-scale)); }
      100% { opacity: var(--sf-min); transform: scale(1); }
    }
    @keyframes sf-drift { from { transform: translate(0, 0); } to { transform: translate(${drift}); } }
    @media (prefers-reduced-motion: reduce) {
      .sf-star, .sf-field { animation: none; opacity: var(--sf-max); }
    }
  </style>
  <g class="sf-field" aria-hidden="true">
${lines}
${dots}
  </g>
${END}`;
}

function readViewBox(svg) {
  const match = svg.match(/viewBox="(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)"/);
  if (!match) throw new Error("viewBox not found");
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
}

async function inject(file, settings) {
  const original = await readFile(file, "utf8");
  const withoutPrevious = original.replace(new RegExp(`${START}[\\s\\S]*?${END}\\s*`, "g"), "");
  const openTag = withoutPrevious.match(/<svg\b[^>]*>/);
  if (!openTag) throw new Error(`no <svg> tag in ${file}`);

  const constellation = buildConstellation(settings, readViewBox(withoutPrevious));
  const patched = withoutPrevious.replace(openTag[0], `${openTag[0]}${constellation}`);

  if (patched === original) {
    console.log(`${file}: unchanged`);
    return;
  }
  await writeFile(file, patched);
  console.log(`${file}: constellation injected`);
}

const [, , ...files] = process.argv;
if (files.length === 0) {
  console.error("usage: inject-constellation.mjs <svg> [svg...]");
  process.exit(1);
}

for (const file of files) {
  const settings = VARIANTS[file.split("/").pop()];
  if (!settings) {
    console.error(`no settings for ${file}`);
    process.exit(1);
  }
  await inject(file, settings);
}
