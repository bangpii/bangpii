#!/usr/bin/env node

// Builds the social badges for the profile header.
//
// These replaced shields.io "for-the-badge" images, which were the last
// generic-looking element in an otherwise bespoke header. Light and dark
// variants are generated from one spec so the two always agree on geometry,
// and every string is pinned with textLength so a different system font on the
// reader's machine can never push it out of the pill.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets", "ambient");
const HEIGHT = 40;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const themes = {
  dark: {
    shell: ["#141D34", "#181640"],
    rim: ["#7C3AED", "#22D3EE"],
    rimOpacity: "0.65",
    label: "#E6ECF7",
    value: "#93A6C9",
    hairline: "#7C3AED",
    hairlineOpacity: "0.25"
  },
  light: {
    shell: ["#FFFFFF", "#F4F6FC"],
    rim: ["#7C3AED", "#22D3EE"],
    rimOpacity: "0.32",
    label: "#1B2437",
    value: "#5B6A85",
    hairline: "#7C3AED",
    hairlineOpacity: "0.18"
  }
};

const icons = {
  github: {
    accent: "#A78BFA",
    body: '<path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.65-.89-3.65-3.96 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.08-1.87 3.75-3.65 3.96.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z"/>'
  },
  instagram: {
    accent: "#22D3EE",
    body: '<rect x="1.1" y="1.1" width="13.8" height="13.8" rx="4.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12.1" cy="3.9" r="1.05"/>'
  },
  email: {
    accent: "#7DD3FC",
    body: '<rect x="1.1" y="3.1" width="13.8" height="9.8" rx="2.1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M1.9 4.6 8 9.1l6.1-4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  }
};

// pinned text widths keep the layout identical across platforms
const badges = [
  { id: "github", label: "GitHub", labelWidth: 44, value: "@bangpii", valueWidth: 58, icon: "github" },
  { id: "instagram", label: "Instagram", labelWidth: 66, value: "@bangpiii", valueWidth: 66, icon: "instagram" },
  { id: "email", label: "Email", labelWidth: 36, value: "baihaqiearrafi6@gmail.com", valueWidth: 150, icon: "email" }
];

const layout = (badge) => {
  const labelX = 38;
  const dividerX = labelX + badge.labelWidth + 12;
  const valueX = dividerX + 12;
  return { labelX, dividerX, valueX, width: Math.round(valueX + badge.valueWidth + 16) };
};

const build = (badge, variant) => {
  const theme = themes[variant];
  const icon = icons[badge.icon];
  const { labelX, dividerX, valueX, width } = layout(badge);
  const mid = HEIGHT / 2;
  const gradientId = `shell-${variant}-${badge.id}`;
  const rimId = `rim-${variant}-${badge.id}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${HEIGHT}" width="${width}" height="${HEIGHT}" role="img" aria-label="${badge.label} ${badge.value}">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.shell[0]}"/>
      <stop offset="1" stop-color="${theme.shell[1]}"/>
    </linearGradient>
    <linearGradient id="${rimId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.rim[0]}" stop-opacity="${theme.rimOpacity}"/>
      <stop offset="1" stop-color="${theme.rim[1]}" stop-opacity="${theme.rimOpacity}"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${HEIGHT - 1}" rx="${HEIGHT / 2 - 0.5}" fill="url(#${gradientId})" stroke="url(#${rimId})"/>
  <g transform="translate(13,${mid - 9}) scale(1.125)" fill="${icon.accent}" color="${icon.accent}">${icon.body}</g>
  <text x="${labelX}" y="25" font-family="${FONT}" font-size="13" font-weight="600" letter-spacing="0.1" textLength="${badge.labelWidth}" lengthAdjust="spacing" fill="${theme.label}">${badge.label}</text>
  <rect x="${dividerX}" y="${mid - 8}" width="1" height="16" fill="${theme.hairline}" fill-opacity="${theme.hairlineOpacity}"/>
  <text x="${valueX}" y="25" font-family="${FONT}" font-size="11.5" font-weight="500" textLength="${badge.valueWidth}" lengthAdjust="spacing" fill="${theme.value}">${badge.value}</text>
</svg>
`;
};

const manifest = [];
for (const badge of badges) {
  for (const variant of ["dark", "light"]) {
    const file = `badge-${badge.id}-${variant}.svg`;
    writeFileSync(join(outputDir, file), build(badge, variant));
    manifest.push({ file, width: layout(badge).width, height: HEIGHT });
  }
}

for (const { file, width, height } of manifest) {
  console.log(`  ${file.padEnd(28)} ${width}x${height}`);
}
console.log(`\n${manifest.length} badge files written to assets/ambient/`);
