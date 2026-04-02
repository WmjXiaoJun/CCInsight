/**
 * CCInsight Annotation Validator
 *
 * Validates all annotation JSON files in annotations/tier{1,2,3,4}/
 * Checks schema compliance, cross-references MANIFEST.json, and ensures annotation quality.
 *
 * Usage: node scripts/validate-annotations.mjs
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __file = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__file), '..');
const ANNOTATIONS_DIR = join(ROOT, 'annotations');

const VALID_TYPES = ['section', 'function', 'class', 'variable', 'import', 'type', 'comment', 'tip', 'warning'];
const VALID_TIERS = [1, 2, 3, 4];

// ─── Results ───────────────────────────────────────────────────────────────────
const errors = [];
const warnings = [];
let totalFiles = 0;
let totalAnnotations = 0;

// ─── Schema Check ───────────────────────────────────────────────────────────────
function validateSchema(filePath, data, relPath) {
  if (!data || typeof data !== 'object') {
    errors.push(`${relPath}: must be a JSON object`);
    return false;
  }

  if (!data.path || typeof data.path !== 'string') {
    errors.push(`${relPath}: missing or invalid 'path' field`);
  } else if (!data.path.endsWith('.json')) {
    // annotation files have .json extension, but the path field should be the source file path
    // e.g., "src/cli/index.ts" not "src/cli/index.ts.json"
    if (data.path.endsWith('.json')) {
      warnings.push(`${relPath}: 'path' should not end with .json (got: ${data.path})`);
    }
  }

  if (!data.tier || typeof data.tier !== 'number') {
    errors.push(`${relPath}: missing or invalid 'tier' field (must be number)`);
  } else if (!VALID_TIERS.includes(data.tier)) {
    errors.push(`${relPath}: invalid tier ${data.tier} (must be 1-4)`);
  } else {
    // Check tier consistency: file must be in corresponding tier dir
    const dirTier = relPath.match(/tier(\d)/)?.[1];
    if (dirTier && String(data.tier) !== dirTier) {
      errors.push(`${relPath}: tier mismatch — file is in tier${dirTier} but annotation says tier ${data.tier}`);
    }
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push(`${relPath}: missing or invalid 'description' field`);
  } else if (data.description.length < 5) {
    warnings.push(`${relPath}: 'description' is too short (< 5 chars): "${data.description}"`);
  }

  if (!Array.isArray(data.annotations)) {
    errors.push(`${relPath}: 'annotations' must be an array`);
    return false;
  }

  for (let i = 0; i < data.annotations.length; i++) {
    const ann = data.annotations[i];
    const annPath = `${relPath}[${i}]`;

    if (!ann || typeof ann !== 'object') {
      errors.push(`${annPath}: annotation must be an object`);
      continue;
    }

    if (!ann.lines || typeof ann.lines !== 'string') {
      errors.push(`${annPath}: missing or invalid 'lines' field`);
    } else {
      const lineRangePattern = /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/;
      if (!lineRangePattern.test(ann.lines.trim())) {
        errors.push(`${annPath}: invalid line range format: "${ann.lines}" (expected: "1-20" or "1-30, 45, 100-120")`);
      }
    }

    if (!ann.type || typeof ann.type !== 'string') {
      errors.push(`${annPath}: missing 'type' field`);
    } else if (!VALID_TYPES.includes(ann.type)) {
      errors.push(`${annPath}: invalid type "${ann.type}" (must be one of: ${VALID_TYPES.join(', ')})`);
    }

    if (!ann.zh || typeof ann.zh !== 'string') {
      errors.push(`${annPath}: missing 'zh' field`);
    } else if (ann.zh.trim().length < 5) {
      warnings.push(`${annPath}: 'zh' annotation is too short (< 5 chars)`);
    }

    if (ann.en !== undefined && typeof ann.en !== 'string') {
      errors.push(`${annPath}: 'en' must be a string if provided`);
    }
  }

  totalAnnotations += data.annotations.length;
  return errors.filter(e => e.startsWith(relPath)).length === 0;
}

// ─── Manifest Cross-Reference ──────────────────────────────────────────────────
function loadManifest() {
  try {
    const raw = readFileSync(join(ANNOTATIONS_DIR, 'MANIFEST.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    warnings.push('MANIFEST.json not found or invalid — skipping cross-reference check');
    return null;
  }
}

// ─── Walk Directory ───────────────────────────────────────────────────────────
function walkAnnotations(dir, tier) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkAnnotations(fullPath, entry);
      continue;
    }

    if (!entry.endsWith('.json')) continue;
    if (entry === 'MANIFEST.json' || entry === '_meta.json') continue;

    totalFiles++;
    const relPath = relative(ANNOTATIONS_DIR, fullPath);
    const fullRelPath = relPath.replace(/\\/g, '/');

    try {
      const raw = readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(raw);
      validateSchema(fullPath, data, fullRelPath);
    } catch (err) {
      if (err instanceof SyntaxError) {
        errors.push(`${fullRelPath}: invalid JSON — ${err.message}`);
      } else {
        errors.push(`${fullRelPath}: read error — ${err.message}`);
      }
    }
  }
}

// ─── Print Results ─────────────────────────────────────────────────────────────
function printResults() {
  const status = errors.length === 0 ? '✅ PASS' : '❌ FAIL';

  console.log('\n' + '═'.repeat(60));
  console.log(`  CCInsight Annotation Validator  ${status}`);
  console.log('═'.repeat(60));

  console.log(`\n  Total files scanned : ${totalFiles}`);
  console.log(`  Total annotations  : ${totalAnnotations}`);

  if (warnings.length > 0) {
    console.log(`\n  ⚠  Warnings: ${warnings.length}`);
    warnings.forEach(w => console.log(`     - ${w}`));
  }

  if (errors.length > 0) {
    console.log(`\n  ❌ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`     - ${e}`));
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  if (errors.length > 0) {
    process.exit(1);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
console.log('🔍 Validating CCInsight annotations...\n');

const manifest = loadManifest();
if (manifest) {
  console.log(`   MANIFEST version : ${manifest.version}`);
  console.log(`   Source repo      : ${manifest.sourceRepository}`);
  console.log(`   Annotation date  : ${manifest.annotationDate}`);
  console.log(`   Tiers           : ${manifest.tiers.map(t => `T${t.tier}`).join(', ')}`);
  console.log(`   Total files     : ${manifest.statistics?.totalFiles ?? 'N/A'}`);
  console.log('');
}

for (const tier of ['tier1', 'tier2', 'tier3', 'tier4']) {
  const dir = join(ANNOTATIONS_DIR, tier);
  try {
    walkAnnotations(dir, tier);
    console.log(`   ✓ ${tier}/ — scanned`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`   ✗ ${tier}/ — directory not found`);
    } else {
      errors.push(`${tier}/: ${err.message}`);
    }
  }
}

printResults();
