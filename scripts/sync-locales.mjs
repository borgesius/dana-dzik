import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(import.meta.dirname, '..', 'src', 'locales');
const TARGET_LOCALES = ['de', 'es', 'fr', 'it', 'ja', 'pt', 'zh'];

// Deep merge: adds keys from source that are missing in target
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (!(key in result)) {
      result[key] = source[key];
    } else if (
      typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    }
    // If both exist and target has a leaf value, keep the existing translation
  }
  return result;
}

// Collect all leaf key paths for diffing / reporting
function collectKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(collectKeys(obj[key], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

// Preserve the key order from English so newly-added keys land in the right spot
function orderLike(obj, reference) {
  const ordered = {};
  for (const key of Object.keys(reference)) {
    if (key in obj) {
      if (
        typeof reference[key] === 'object' && reference[key] !== null && !Array.isArray(reference[key]) &&
        typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])
      ) {
        ordered[key] = orderLike(obj[key], reference[key]);
      } else {
        ordered[key] = obj[key];
      }
    }
  }
  // Also include any keys in obj that aren't in reference (shouldn't happen, but safe)
  for (const key of Object.keys(obj)) {
    if (!(key in ordered)) {
      ordered[key] = obj[key];
    }
  }
  return ordered;
}

// --- Main ---
const enPath = join(LOCALES_DIR, 'en.json');
const en = JSON.parse(readFileSync(enPath, 'utf-8'));
const enKeys = new Set(collectKeys(en));

console.log(`English locale has ${enKeys.size} leaf keys.\n`);

for (const locale of TARGET_LOCALES) {
  const filePath = join(LOCALES_DIR, `${locale}.json`);
  const original = JSON.parse(readFileSync(filePath, 'utf-8'));
  const originalKeys = new Set(collectKeys(original));

  const missing = [...enKeys].filter(k => !originalKeys.has(k));

  if (missing.length === 0) {
    console.log(`${locale}.json — already in sync.`);
    continue;
  }

  const merged = deepMerge(original, en);
  const ordered = orderLike(merged, en);

  writeFileSync(filePath, JSON.stringify(ordered, null, 4) + '\n', 'utf-8');

  console.log(`${locale}.json — added ${missing.length} missing keys:`);
  for (const k of missing) {
    console.log(`  + ${k}`);
  }
  console.log();
}

console.log('Done.');
