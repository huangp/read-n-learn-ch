#!/usr/bin/env node
/**
 * build-dictionary.js
 * Downloads CC-CEDICT and the HSK 1-6 word lists, merges them into two
 * JSON files that can be bundled with the React Native app
 *
 * Run: node scripts/build-dictionary.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---- Config ----------------------------------------------------------------

const CEDICT_URL =
  'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

const HSK_DIR = path.join(__dirname, '..', 'assets', 'hsk');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'dict');

// ---- Helpers ---------------------------------------------------------------

/** Download a URL via curl (MDBG needs a User-Agent header). Returns a Buffer. */
function download(url) {
  const tmpFile = path.join(OUT_DIR, '_cedict_download.tmp.gz');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  execSync(`curl -L -o "${tmpFile}" -A "Mozilla/5.0" "${url}"`, {
    timeout: 60000,
    stdio: 'inherit',
  });
  const buf = fs.readFileSync(tmpFile);
  fs.unlinkSync(tmpFile);
  return buf;
}

/** Convert numbered pinyin (e.g. "pin1 yin1") to tone-marked pinyin. */
function numberedToToneMarked(numbered) {
  const toneMap = {
    a: ['ā', 'á', 'ǎ', 'à', 'a'],
    e: ['ē', 'é', 'ě', 'è', 'e'],
    i: ['ī', 'í', 'ǐ', 'ì', 'i'],
    o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
    u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
    v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],  // ü encoded as v in CEDICT
  };

  return numbered
    .split(' ')
    .map((syl) => {
      const m = syl.match(/^([a-zA-Zü]+?)(\d)$/);
      if (!m) return syl; // punctuation, etc.
      let [, letters, toneStr] = m;
      const tone = parseInt(toneStr, 10);
      if (tone < 1 || tone > 5) return syl;

      // Replace 'u:' or 'v' with 'ü'
      letters = letters.replace(/u:/g, 'ü').replace(/v/g, 'ü');

      // Find the vowel to place the tone mark on (standard rules)
      const lower = letters.toLowerCase();
      let idx = -1;

      // Rule: 'a' or 'e' always get the mark
      idx = lower.indexOf('a');
      if (idx === -1) idx = lower.indexOf('e');

      // Rule: 'ou' → mark on 'o'
      if (idx === -1 && lower.includes('ou')) {
        idx = lower.indexOf('o');
      }

      // Otherwise the second vowel gets the mark
      if (idx === -1) {
        const vowels = 'iouüIOU';
        let last = -1;
        for (let i = 0; i < lower.length; i++) {
          if (vowels.includes(letters[i])) last = i;
        }
        idx = last;
      }

      if (idx === -1) return letters; // no vowel found, just return

      const charAtIdx = letters[idx].toLowerCase();
      const mapKey = charAtIdx === 'ü' ? 'v' : charAtIdx;
      const replacement = toneMap[mapKey]?.[tone - 1];
      if (!replacement) return letters;

      // Preserve original casing
      const finalChar =
        letters[idx] === letters[idx].toUpperCase()
          ? replacement.toUpperCase()
          : replacement;

      return letters.slice(0, idx) + finalChar + letters.slice(idx + 1);
    })
    .join(' ');
}

/** Parse one CC-CEDICT line. Returns null for comments / blank lines. */
function parseLine(line) {
  if (!line || line.startsWith('#')) return null;
  // Traditional Simplified [pinyin] /def1/def2/
  const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/);
  if (!m) return null;
  const [, traditional, simplified, pinyinRaw, defStr] = m;
  const pinyin = numberedToToneMarked(pinyinRaw.toLowerCase());
  const definitions = defStr.split('/').map((d) => d.trim()).filter(Boolean);
  return { s: simplified, p: pinyin, d: definitions };
}

// ---- Load HSK word lists ---------------------------------------------------

function loadHSKWords() {
  /** Returns a Map<simplified, hskLevel> */
  const map = new Map();

  for (let level = 1; level <= 6; level++) {
    const file = path.join(HSK_DIR, `hsk${level}.json`);
    if (!fs.existsSync(file)) {
      console.warn(`  ⚠  ${file} not found – skipping HSK ${level}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let count = 0;
    for (const item of data) {
      const word = item.simplified || item.hanzi || item.word;
      if (word && !map.has(word)) {
        map.set(word, level);
        count++;
      }
    }
    console.log(`  ✓ HSK ${level}: ${count} words`);
  }

  return map;
}

// ---- Main ------------------------------------------------------------------

function entryScore(e) {
  let score = 0;
  // More definitions = more common usage
  score += e.d.length * 10;
  // Penalize surname-only entries
  if (e.d.length === 1 && e.d[0].startsWith('surname ')) score -= 50;
  // Penalize "variant of" or "old variant" entries
  const firstDef = e.d[0] || '';
  if (firstDef.startsWith('variant of ') || firstDef.startsWith('old variant of ')) score -= 100;
  // Bonus for HSK-tagged
  if (e.h) score += 20;
  return score;
}

function main() {
  console.log('📖 Building dictionary from CC-CEDICT...\n');

  // 1. Load HSK word lists
  console.log('Step 1: Loading HSK word lists...');
  const hskMap = loadHSKWords();
  console.log(`  Total HSK words: ${hskMap.size}\n`);

  // 2. Download CC-CEDICT
  console.log('Step 2: Downloading CC-CEDICT...');
  const gzBuf = download(CEDICT_URL);
  console.log(`  Downloaded ${(gzBuf.length / 1024 / 1024).toFixed(1)} MB (gzipped)`);

  const txtBuf = zlib.gunzipSync(gzBuf);
  console.log(`  Uncompressed ${(txtBuf.length / 1024 / 1024).toFixed(1)} MB\n`);

  // 3. Parse
  console.log('Step 3: Parsing entries...');
  const lines = txtBuf.toString('utf8').split('\n');

  // Collect all parsed entries first, then deduplicate
  const allParsed = [];
  let total = 0;
  for (const line of lines) {
    const entry = parseLine(line);
    if (!entry) continue;
    total++;

    const hskLevel = hskMap.get(entry.s);
    if (hskLevel) {
      entry.h = hskLevel;
    }
    allParsed.push(entry);
  }

  // --- Deduplicate: pick the best entry per simplified character ---
  const bestBySimplified = new Map(); // simplified → best entry
  const extraBySimplified = new Map(); // simplified → array of other readings

  for (const entry of allParsed) {
    const existing = bestBySimplified.get(entry.s);
    if (!existing) {
      bestBySimplified.set(entry.s, entry);
      extraBySimplified.set(entry.s, []);
    } else {
      // Compare scores and keep the better one
      if (entryScore(entry) > entryScore(existing)) {
        extraBySimplified.get(entry.s).push(existing);
        bestBySimplified.set(entry.s, entry);
      } else {
        extraBySimplified.get(entry.s).push(entry);
      }
    }
  }

  // Merge extra readings into the best entry's definitions
  for (const [simp, best] of bestBySimplified) {
    const extras = extraBySimplified.get(simp) || [];
    for (const extra of extras) {
      if (extra.p !== best.p) {
        // Different pinyin reading — append as "also ..."
        const altDef = 'also ' + extra.p + ': ' + extra.d.join('; ');
        best.d.push(altDef);
      }
    }
  }

  // Split into core (HSK) and full
  const coreEntries = [];
  const fullEntries = [];
  for (const entry of bestBySimplified.values()) {
    if (entry.h) {
      coreEntries.push(entry);
    } else {
      fullEntries.push(entry);
    }
  }

  console.log(`  Total parsed: ${total}`);
  console.log(`  Unique simplified: ${bestBySimplified.size}`);
  console.log(`  Core (HSK 1-6): ${coreEntries.length}`);
  console.log(`  Full (rest): ${fullEntries.length}\n`);

  // 4. Write output
  console.log('Step 4: Writing JSON files...');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const corePath = path.join(OUT_DIR, 'cedict-core.json');
  const fullPath = path.join(OUT_DIR, 'cedict-full.json');

  fs.writeFileSync(corePath, JSON.stringify(coreEntries));
  fs.writeFileSync(fullPath, JSON.stringify(fullEntries));

  const coreSize = (fs.statSync(corePath).size / 1024 / 1024).toFixed(2);
  const fullSize = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);

  console.log(`  ✓ ${corePath}  (${coreSize} MB)`);
  console.log(`  ✓ ${fullPath}  (${fullSize} MB)\n`);

  console.log('✅ Dictionary build complete!');
}

try {
  main();
} catch (err) {
  console.error('❌ Error:', err);
  process.exit(1);
}
