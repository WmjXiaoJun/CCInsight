/**
 * CCInsight Annotation Bundler
 *
 * Reads all annotations/tierN/ files recursively and produces:
 *   - frontend/public/annotations/bundle.json
 *   - frontend/public/annotations/MANIFEST.json
 *
 * Run: node scripts/build-annotations.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __file = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__file), '..');
const ANNOTATIONS_SRC = join(ROOT, 'annotations');
const PUBLIC_OUT = join(ROOT, 'frontend', 'public', 'annotations');
const MANIFEST_SRC = join(ANNOTATIONS_SRC, 'MANIFEST.json');
const BUNDLE_OUT = join(PUBLIC_OUT, 'bundle.json');
const MANIFEST_OUT = join(PUBLIC_OUT, 'MANIFEST.json');

const SKIP_FILES = new Set(['MANIFEST.json', '_meta.json']);
const tierDirs = ['tier1', 'tier2', 'tier3', 'tier4'];
const bundle = [];

// ─── Recursive walk ────────────────────────────────────────────────────────────
function walkAnnotations(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkAnnotations(fullPath); // recurse into subdirectories
    } else if (stat.isFile() && entry.endsWith('.json') && !SKIP_FILES.has(entry)) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const annotation = JSON.parse(content);
        bundle.push(annotation);
      } catch (err) {
        console.warn(`⚠  Skipping invalid JSON: ${fullPath}`, err.message);
      }
    }
  }
}

for (const tier of tierDirs) {
  const tierDir = join(ANNOTATIONS_SRC, tier);
  if (!existsSync(tierDir)) {
    console.warn(`⚠  ${tier}/ not found, skipping`);
    continue;
  }
  walkAnnotations(tierDir);
}

// Sort by tier then by priority (if available)
bundle.sort((a, b) => {
  if (a.tier !== b.tier) return a.tier - b.tier;
  return 0;
});

// ─── Write outputs ──────────────────────────────────────────────────────────────
mkdirSync(PUBLIC_OUT, { recursive: true });
writeFileSync(BUNDLE_OUT, JSON.stringify(bundle, null, 2), 'utf-8');
console.log(`✅ bundle.json written — ${bundle.length} files`);

if (existsSync(MANIFEST_SRC)) {
  copyFileSync(MANIFEST_SRC, MANIFEST_OUT);
  console.log(`✅ MANIFEST.json copied`);
} else {
  console.warn(`⚠  MANIFEST.json not found, skipping`);
}

console.log(`📁 Output: ${PUBLIC_OUT}`);
