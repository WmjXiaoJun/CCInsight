#!/usr/bin/env node
/**
 * CCInsight AI Annotation Generator
 *
 * Uses LLM to generate Chinese annotations for source files.
 * Outputs JSON files compatible with the annotations/ directory structure.
 *
 * Usage:
 *   node scripts/generate-annotations.mjs --file src/cli/index.ts --tier 1
 *   node scripts/generate-annotations.mjs --dir backend/src --tier 1 --dry-run
 *   node scripts/generate-annotations.mjs --interactive
 *
 * Environment variables:
 *   CCINSIGHT_LLM_PROVIDER=openai|openrouter|azure|generic
 *   CCINSIGHT_LLM_BASE_URL=https://api.openai.com/v1
 *   CCINSIGHT_LLM_API_KEY=sk-...
 *   CCINSIGHT_LLM_MODEL=gpt-4o
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __file = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__file), '..');

// ─── Config ────────────────────────────────────────────────────────────────────
const LLM_CONFIG = {
  provider: process.env.CCINSIGHT_LLM_PROVIDER || 'openai',
  baseUrl: process.env.CCINSIGHT_LLM_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.CCINSIGHT_LLM_API_KEY || '',
  model: process.env.CCINSIGHT_LLM_MODEL || 'gpt-4o',
};

const OUTPUT_DIR = join(ROOT, 'annotations');

// ─── Annotation Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are CCInsight, an expert code annotator.

Your task: Generate high-quality Chinese annotations for the provided source code file.
Follow these rules STRICTLY:

1. Analyze the file purpose, key functions, classes, and design decisions
2. Each annotation must explain the "WHY" not just the "WHAT"
3. Annotations should be 50-200 characters in Chinese
4. Cover the most important 3-6 sections of the code
5. Return ONLY a valid JSON object (no markdown, no explanation)

## Output Format
Return a JSON object with this schema:
{
  "path": "<relative file path from src/>",
  "tier": <tier number>,
  "description": "<2-3 sentence overview of what this file does>",
  "annotations": [
    {
      "lines": "10-30",
      "type": "section|function|class|variable|import|type|comment|tip|warning",
      "name": "<optional function/class name>",
      "zh": "<Chinese explanation 50-200 chars>",
      "en": "<optional English note>"
    }
  ]
}

## Type Guidelines
- section: A logical block of code (imports, error handling, config, etc.)
- function: A function/method — explain parameters, return value, and purpose
- class: A class — explain its responsibility and design pattern
- variable: A variable/constant — especially obscure or important ones
- import: Import statements grouped together
- type: A type definition (interface, type alias, enum)
- comment: An existing comment that needs translation/explanation
- tip: Best practice or important insight
- warning: Potential bugs, gotchas, or security concerns`;

// ─── LLM Client ───────────────────────────────────────────────────────────────
async function callLLM(messages, options = {}) {
  const { baseUrl = LLM_CONFIG.baseUrl, apiKey = LLM_CONFIG.apiKey, model = LLM_CONFIG.model } = options;

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Parse CLI Args ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// ─── Annotation Generation ─────────────────────────────────────────────────────
async function generateForFile(filePath, tier = 1, dryRun = false) {
  console.log(`\n📄 ${filePath} (Tier ${tier})`);

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`  ❌ Cannot read file: ${err.message}`);
    return null;
  }

  // Skip very large files (>100KB)
  if (content.length > 100 * 1024) {
    console.log(`  ⏭  Skipping — file too large (${(content.length / 1024).toFixed(0)}KB)`);
    return null;
  }

  // Build relative path
  const relPath = filePath.replace(/\\/g, '/').replace(/^.*\/(backend|frontend)\/src\//, '$1/src/');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `File: ${relPath}\n\n\`\`\`\n${content}\n\`\`\``,
    },
  ];

  console.log(`  🤖 Calling LLM (${LLM_CONFIG.model})...`);

  try {
    const rawContent = await callLLM(messages);
    const annotation = parseAnnotationResponse(rawContent, relPath, tier);

    if (!annotation) {
      console.error(`  ❌ Failed to parse LLM response`);
      console.error(`  Raw: ${rawContent.slice(0, 200)}...`);
      return null;
    }

    if (dryRun) {
      console.log(`  🧪 DRY RUN — would write:`);
      console.log(`     ${annotation.annotations.length} annotations for ${annotation.path}`);
      console.log(JSON.stringify(annotation, null, 2).slice(0, 300) + '...');
      return annotation;
    }

    // Determine output path
    const parts = relPath.replace(/\\/g, '/').split('/');
    let tierDir = OUTPUT_DIR;
    for (const p of parts) {
      tierDir = join(tierDir, p);
    }
    tierDir = join(OUTPUT_DIR, `tier${tier}`, ...parts.slice(0, -1));
    mkdirSync(tierDir, { recursive: true });

    const outPath = join(tierDir, `${basename(parts[parts.length - 1], extname(relPath))}.ts.json`);
    writeFileSync(outPath, JSON.stringify(annotation, null, 2), 'utf-8');
    console.log(`  ✅ Written: ${outPath.replace(ROOT, '')}`);

    return annotation;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return null;
  }
}

function parseAnnotationResponse(raw, path, tier) {
  let jsonStr = raw.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) jsonStr = match[1].trim();

  try {
    const data = JSON.parse(jsonStr);
    return {
      path: data.path || path,
      tier: Number(data.tier) || tier,
      description: data.description || '',
      annotations: (data.annotations || []).map((a, i) => ({
        lines: String(a.lines || '1-10'),
        type: validateType(a.type),
        name: a.name || undefined,
        zh: String(a.zh || a.description || ''),
        en: a.en || undefined,
      })),
    };
  } catch (err) {
    console.error(`  JSON parse error: ${err.message}`);
    return null;
  }
}

function validateType(type) {
  const valid = ['section', 'function', 'class', 'variable', 'import', 'type', 'comment', 'tip', 'warning'];
  const t = String(type || 'comment').toLowerCase();
  return valid.includes(t) ? t : 'comment';
}

// ─── Batch Processing ─────────────────────────────────────────────────────────
async function processDirectory(dirPath, tier = 1, dryRun = false, exts = ['.ts', '.tsx', '.js', '.jsx']) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += await processDirectory(fullPath, tier, dryRun, exts);
    } else if (exts.includes(extname(entry.name).toLowerCase())) {
      const result = await generateForFile(fullPath, tier, dryRun);
      if (result) count++;
    }
  }
  return count;
}

// ─── Interactive Mode ──────────────────────────────────────────────────────────
async function interactiveMode() {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (q) =>
    new Promise((res) => {
      rl.question(q, res);
    });

  console.log('\n📝 CCInsight AI Annotation Generator — Interactive Mode\n');
  console.log('LLM Configuration:');
  console.log(`  Provider : ${LLM_CONFIG.provider}`);
  console.log(`  Base URL : ${LLM_CONFIG.baseUrl}`);
  console.log(`  Model    : ${LLM_CONFIG.model}`);
  console.log('');

  const filePath = await ask('Source file or directory: ');
  if (!filePath.trim()) {
    console.log('Cancelled.');
    rl.close();
    return;
  }

  const tierStr = await ask('Tier (1-4) [default: 1]: ');
  const tier = parseInt(tierStr) || 1;

  const dryRunStr = await ask('Dry run? (y/N): ');
  const dryRun = dryRunStr.trim().toLowerCase() === 'y';

  const fullPath = resolve(filePath.trim());
  if (!existsSync(fullPath)) {
    console.error(`File or directory not found: ${fullPath}`);
    rl.close();
    return;
  }

  rl.close();

  const stat = statSync(fullPath);
  if (stat.isFile()) {
    await generateForFile(fullPath, tier, dryRun);
  } else {
    const count = await processDirectory(fullPath, tier, dryRun);
    console.log(`\n✅ Processed ${count} files`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printUsage();
    return;
  }

  if (args.interactive || args.i) {
    await interactiveMode();
    return;
  }

  if (args.file) {
    const result = await generateForFile(resolve(args.file), parseInt(args.tier) || 1, args['dry-run'] === 'true');
    if (result) console.log('\n✅ Done');
    return;
  }

  if (args.dir || args.directory) {
    const dir = resolve(args.dir || args.directory);
    if (!existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }
    const count = await processDirectory(dir, parseInt(args.tier) || 1, args['dry-run'] === 'true');
    console.log(`\n✅ Processed ${count} files`);
    return;
  }

  printUsage();
}

function printUsage() {
  console.log(`
📝 CCInsight AI Annotation Generator

Usage:
  node scripts/generate-annotations.mjs --file <path> --tier <1-4>
  node scripts/generate-annotations.mjs --dir <path> --tier <1-4>
  node scripts/generate-annotations.mjs --interactive
  node scripts/generate-annotations.mjs --help

Options:
  --file <path>       Generate annotation for a single file
  --dir <path>        Generate annotations for all files in a directory
  --tier <1-4>        Tier level (default: 1)
  --dry-run           Show what would be generated without writing files
  --interactive, -i   Interactive mode with prompts

Environment Variables:
  CCINSIGHT_LLM_PROVIDER=openai|openrouter|azure|generic
  CCINSIGHT_LLM_BASE_URL=https://api.openai.com/v1
  CCINSIGHT_LLM_API_KEY=sk-...
  CCINSIGHT_LLM_MODEL=gpt-4o

Examples:
  node scripts/generate-annotations.mjs --file backend/src/cli/index.ts --tier 1
  node scripts/generate-annotations.mjs --dir backend/src/core --tier 4
  CCINSIGHT_LLM_API_KEY=sk-xxx node scripts/generate-annotations.mjs --interactive
`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
