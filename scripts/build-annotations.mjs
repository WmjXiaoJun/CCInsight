/**
 * CCInsight Annotation Bundler
 *
 * Reads all annotations/*.json files (tier1–tier4) and produces:
 *   - frontend/public/annotations/bundle.json   (aggregated array, all annotations merged)
 *   - frontend/public/annotations/MANIFEST.json (copied from annotations/MANIFEST.json)
 *
 * Run: node scripts/build-annotations.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ANNOTATIONS_SRC = join(ROOT, 'annotations');
const PUBLIC_OUT = join(ROOT, 'frontend', 'public', 'annotations');

const MANIFEST_SRC = join(ANNOTATIONS_SRC, 'MANIFEST.json');
const BUNDLE_OUT = join(PUBLIC_OUT, 'bundle.json');
const MANIFEST_OUT = join(PUBLIC_OUT, 'MANIFEST.json');

// Collect all annotation JSON files from tier directories
const tierDirs = ['tier1', 'tier2', 'tier3', 'tier4'];
const bundle = [];

for (const tier of tierDirs) {
  const tierDir = join(ANNOTATIONS_SRC, tier);
  if (!existsSync(tierDir)) continue;

  const { readdirSync } = await import('fs');
  const files = readdirSync(tierDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const filePath = join(tierDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const annotation = JSON.parse(content);
      bundle.push(annotation);
    } catch (err) {
      console.warn(`⚠  Skipping invalid JSON: ${filePath}`, err.message);
    }
  }
}

// Sort by tier then by priority (if available)
bundle.sort((a, b) => {
  if (a.tier !== b.tier) return a.tier - b.tier;
  return 0;
});

// Write bundle
mkdirSync(PUBLIC_OUT, { recursive: true });
writeFileSync(BUNDLE_OUT, JSON.stringify(bundle, null, 2), 'utf-8');
console.log(`✅ bundle.json written — ${bundle.length} files`);

// Copy MANIFEST.json
if (existsSync(MANIFEST_SRC)) {
  copyFileSync(MANIFEST_SRC, MANIFEST_OUT);
  console.log(`✅ MANIFEST.json copied`);
} else {
  console.warn('⚠  MANIFEST.json not found, skipping');
}

console.log(`📁 Output: ${PUBLIC_OUT}`);
