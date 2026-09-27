#!/usr/bin/env node

// Builds one decorative band per top-level profile section.
//
// GitHub's markdown sanitiser filters the CSS that would let text sit on top of
// a background, so each section gets a panel directly under its heading instead.
// Heights are deliberately different: a section with three paragraphs earns a
// taller band than a section with a three row table, which is what keeps the
// profile from turning into a stack of banners.
//
// All bands share one background gradient, blueprint grid, glow, hairline and
// corner radius, so they read as a set rather than as five unrelated pictures.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets", "ambient");
const WIDTH = 1200;
const RADIUS = 14;

const palette = {
  shell: ["#0A1020", "#0E1730", "#16143A", "#0B1226"],
  grid: "#93A7CC",
  accent: "#7C3AED",
  mid: "#6366F1",
  light: "#22D3EE",
  soft: "#A78BFA",
  pale: "#7DD3FC",
  muted: "#8FA3C8"
};

const defs = (id) => `  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.shell[0]}"/>
      <stop offset="0.45" stop-color="${palette.shell[1]}"/>
      <stop offset="0.78" stop-color="${palette.shell[2]}"/>
      <stop offset="1" stop-color="${palette.shell[3]}"/>
    </linearGradient>
    <linearGradient id="wire-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${palette.accent}"/>
      <stop offset="0.5" stop-color="${palette.mid}"/>
      <stop offset="1" stop-color="${palette.light}"/>
    </linearGradient>
    <linearGradient id="edge-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${palette.accent}" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="${palette.mid}" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${palette.light}" stop-opacity="0.5"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${palette.mid}" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="${palette.accent}" stop-opacity="0.09"/>
      <stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid-${id}" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M30 0H0v30" fill="none" stroke="${palette.grid}" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
    <clipPath id="clip-${id}"><rect width="${WIDTH}" height="HEIGHT" rx="${RADIUS}"/></clipPath>
    <filter id="soft-${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>
  </defs>`;

const styles = `  <style>
    .breathe { animation: sf-breathe 9s ease-in-out infinite; }
    .pulse { animation: sf-pulse 7s linear infinite; }
    @keyframes sf-breathe { 0%, 100% { opacity: 0.32; } 50% { opacity: 0.72; } }
    @keyframes sf-pulse { to { stroke-dashoffset: -240; } }
    @media (prefers-reduced-motion: reduce) { .breathe, .pulse { animation: none; } }
  </style>`;

const band = ({ id, height, alt, motif }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" aria-label="${alt}">
${defs(id).replace("HEIGHT", String(height))}
${styles}
  <g clip-path="url(#clip-${id})">
    <rect width="${WIDTH}" height="${height}" fill="url(#bg-${id})"/>
    <rect width="${WIDTH}" height="${height}" fill="url(#grid-${id})"/>
    <ellipse class="breathe" cx="600" cy="${height / 2}" rx="440" ry="${Math.round(height * 0.5)}" fill="url(#glow-${id})"/>
${motif}
  </g>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="${RADIUS}" fill="none" stroke="url(#edge-${id})" stroke-width="1"/>
</svg>
`;

// About Me: the whole path, interface down to server, as a layered stack
const aboutMotif = () => {
  const layers = [
    { w: 860, detail: "components" },
    { w: 700, detail: "endpoints" },
    { w: 540, detail: "records" }
  ];
  const barH = 18;
  const gap = 16;
  const top = 25;
  return `    <g>
${layers
  .map((layer, i) => {
    const y = top + i * (barH + gap);
    const x = 600 - layer.w / 2;
    const detail =
      layer.detail === "components"
        ? `<g fill="${palette.soft}" fill-opacity="0.5">${Array.from({ length: 9 }, (_, k) => `<rect x="${x + 250 + k * 62}" y="${y + 6}" width="40" height="6" rx="3"/>`).join("")}</g>`
        : layer.detail === "endpoints"
          ? `<g fill="${palette.pale}" fill-opacity="0.55">${Array.from({ length: 7 }, (_, k) => `<circle cx="${x + 260 + k * 56}" cy="${y + barH / 2}" r="3.4"/>`).join("")}</g>`
          : `<g stroke="${palette.light}" stroke-opacity="0.28" stroke-width="1.4">${Array.from({ length: 12 }, (_, k) => `<path d="M${x + 250 + k * 24} ${y + 3}v${barH - 6}"/>`).join("")}</g>`;
    return `      <rect x="${x}" y="${y}" width="${layer.w}" height="${barH}" rx="${barH / 2}" fill="url(#wire-about)" fill-opacity="${0.34 - i * 0.06}"/>
      <rect x="${x + 18}" y="${y + 5}" width="8" height="${barH - 10}" rx="4" fill="${palette.soft}" fill-opacity="0.8"/>
${detail}`;
  })
  .join("\n")}
    </g>`;
};

// Current Focus: a reticle settling on one point
const focusMotif = (id) => {
  const c = 600;
  const y = 48;
  const rings = [30, 21, 12];
  return `    <g>
${rings
  .map((r, i) => `      <circle cx="${c}" cy="${y}" r="${r}" fill="none" stroke="url(#wire-${id})" stroke-opacity="${0.5 - i * 0.12}" stroke-width="1.4"/>`)
  .join("\n")}
      <g stroke="${palette.muted}" stroke-opacity="0.3" stroke-width="1.2" stroke-linecap="round">
        <path d="M${c - 44} ${y}h20M${c + 24} ${y}h20M${c} ${y - 44}v20M${c} ${y + 24}v20"/>
      </g>
      <g fill="${palette.muted}" fill-opacity="0.35">
        <circle cx="${c - 52}" cy="${y}" r="1.8"/><circle cx="${c + 52}" cy="${y}" r="1.8"/>
        <circle cx="${c}" cy="${y - 52}" r="1.8"/><circle cx="${c}" cy="${y + 52}" r="1.8"/>
      </g>
      <circle class="breathe" cx="${c}" cy="${y}" r="7" fill="${palette.pale}" filter="url(#soft-${id})"/>
      <circle cx="${c}" cy="${y}" r="3" fill="${palette.pale}"/>
      <g stroke="url(#wire-${id})" stroke-opacity="0.22" stroke-width="1.2" stroke-linecap="round">
        <path d="M180 48h70M950 48h70"/>
      </g>
    </g>`;
};

// Featured Work: three selected cards, the middle one picked
const workMotif = (id) => {
  const cards = [
    { x: 250, picked: false },
    { x: 500, picked: true },
    { x: 750, picked: false }
  ];
  return `    <g>
${cards
  .map(
    (card) => `      <g>
        <rect x="${card.x}" y="20" width="200" height="56" rx="10" fill="url(#wire-${id})" fill-opacity="${card.picked ? 0.14 : 0.06}"/>
        <rect x="${card.x}" y="20" width="200" height="56" rx="10" fill="none" stroke="${card.picked ? palette.soft : palette.muted}" stroke-opacity="${card.picked ? 0.6 : 0.22}" stroke-width="1.3"/>
        <rect x="${card.x + 16}" y="34" width="72" height="7" rx="3.5" fill="${palette.soft}" fill-opacity="${card.picked ? 0.85 : 0.4}"/>
        <g fill="${palette.muted}" fill-opacity="0.28">
          <rect x="${card.x + 16}" y="50" width="140" height="5" rx="2.5"/>
          <rect x="${card.x + 16}" y="62" width="104" height="5" rx="2.5"/>
        </g>
      </g>`
  )
  .join("\n")}
    </g>`;
};

// Project Gallery: a contact sheet of the shots
const galleryMotif = (id) => {
  const tiles = [false, true, false, false, true, false];
  const w = 168;
  const gap = 14;
  const total = tiles.length * w + (tiles.length - 1) * gap;
  const start = (WIDTH - total) / 2;
  return `    <g>
${tiles
  .map(
    (hot, i) => `      <rect x="${start + i * (w + gap)}" y="20" width="${w}" height="40" rx="8"
        fill="url(#wire-${id})" fill-opacity="${hot ? 0.2 : 0.09}"
        stroke="${hot ? palette.soft : palette.muted}" stroke-opacity="${hot ? 0.62 : 0.3}" stroke-width="1.2"/>`
  )
  .join("\n")}
      <g stroke="url(#wire-${id})" stroke-opacity="0.4" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="4 8">
        <path d="M${start} 70h${total}"/>
      </g>
    </g>`;
};

// How I Build: request travelling the whole path
const buildMotif = (id) => {
  const stops = [200, 400, 600, 800, 1000];
  return `    <g>
      <path d="M200 54h800" fill="none" stroke="url(#wire-${id})" stroke-opacity="0.4" stroke-width="1.6" stroke-linecap="round"/>
      <path class="pulse" d="M200 54h800" fill="none" stroke="${palette.pale}" stroke-opacity="0.8" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="60 180"/>
${stops
  .map(
    (x, i) => `      <g>
        <circle cx="${x}" cy="54" r="11" fill="url(#bg-${id})" stroke="${i === 2 ? palette.soft : palette.light}" stroke-opacity="${i === 2 ? 0.75 : 0.45}" stroke-width="1.4"/>
        <circle cx="${x}" cy="54" r="3" fill="${i === 2 ? palette.soft : palette.light}" fill-opacity="0.9"/>
        <rect x="${x - 30}" y="80" width="60" height="5" rx="2.5" fill="${palette.muted}" fill-opacity="0.26"/>
      </g>`
  )
  .join("\n")}
    </g>`;
};

const bands = [
  { id: "about", height: 132, alt: "The whole path: interface, API, and data", motif: aboutMotif },
  { id: "focus", height: 96, alt: "A reticle settling on a single point", motif: focusMotif },
  { id: "work", height: 96, alt: "Three selected project cards", motif: workMotif },
  { id: "gallery", height: 80, alt: "A contact sheet of project screenshots", motif: galleryMotif },
  { id: "build", height: 108, alt: "A request travelling the full build path", motif: buildMotif }
];

for (const entry of bands) {
  const file = `band-${entry.id}.svg`;
  writeFileSync(join(outputDir, file), band({ ...entry, motif: entry.motif(entry.id) }));
  console.log(`  ${file.padEnd(20)} ${WIDTH}x${entry.height}`);
}
console.log(`\n${bands.length} section bands written to assets/ambient/`);
