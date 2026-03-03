#!/usr/bin/env node
/**
 * build-examples.js
 *
 * Downloads Tatoeba Chinese-English sentence pairs and builds
 * a JSON file with example sentences for the most common words.
 *
 * Run: node scripts/build-examples.js
 * Or integrated: npm run build:dict
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pinyin = require('pinyin');

// ---- Config ----------------------------------------------------------------

const TATOEBA_BASE_URL = 'https://downloads.tatoeba.org/exports/';
const SENTENCES_FILE = 'sentences.tar.bz2';
const LINKS_FILE = 'links.tar.bz2';

const OUT_DIR = path.join(__dirname, '..', 'assets', 'dict');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const WORD_LIST_PATH = path.join(__dirname, '..', 'assets', 'dict', 'cedict-full.json');

// Target: 50MB examples file
const MAX_WORDS = 50000;  // Top 50,000 words
const MAX_EXAMPLES_PER_WORD = 3;
const MAX_TOTAL_EXAMPLES = 150000;  // 50K words × 3 examples

// ---- Helpers ---------------------------------------------------------------

/**
 * Download a file using curl
 */
function download(url, outputPath) {
  console.log(`[examples] Downloading ${path.basename(url)}...`);
  try {
    execSync(`curl -L -o "${outputPath}" "${url}"`, {
      timeout: 600000,  // 10 minutes for large files
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    console.error(`[examples] Failed to download ${url}:`, error.message);
    return false;
  }
}

/**
 * Extract tar.bz2 file
 */
function extractTarBz2(tarPath, outputDir) {
  console.log(`[examples] Extracting ${path.basename(tarPath)}...`);
  try {
    execSync(`tar -xjf "${tarPath}" -C "${outputDir}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`[examples] Failed to extract:`, error.message);
    return false;
  }
}

/**
 * Generate pinyin for Chinese text
 */
function generatePinyin(chinese) {
  try {
    const result = pinyin(chinese, {
      style: pinyin.STYLE_TONE,
      heteronym: false,
    });
    return result.map(arr => arr[0]).join(' ');
  } catch (error) {
    return null;
  }
}

/**
 * Estimate difficulty level (1-5) based on sentence length
 */
function estimateDifficulty(chinese) {
  const charCount = chinese.length;
  
  if (charCount <= 5) return 1;
  if (charCount <= 10) return 2;
  if (charCount <= 15) return 3;
  if (charCount <= 20) return 4;
  return 5;
}

/**
 * Load word list from dictionary
 */
function loadWordList() {
  console.log('[examples] Loading word list...');
  
  if (!fs.existsSync(WORD_LIST_PATH)) {
    console.warn(`[examples] Word list not found: ${WORD_LIST_PATH}`);
    return [];
  }

  const data = JSON.parse(fs.readFileSync(WORD_LIST_PATH, 'utf8'));
  // Sort by HSK level (lower = more common), then alphabetically
  const sorted = data
    .filter(entry => entry.s && entry.s.length >= 1 && entry.s.length <= 4)  // Only 1-4 character words
    .sort((a, b) => {
      const hskDiff = (a.h || 7) - (b.h || 7);
      if (hskDiff !== 0) return hskDiff;
      return a.s.localeCompare(b.s);
    });
  
  const words = sorted.slice(0, MAX_WORDS).map(entry => entry.s);
  console.log(`[examples] Loaded ${words.length} words from dictionary`);
  return words;
}

/**
 * Parse Tatoeba sentences file
 * Format: id [tab] lang [tab] text [tab] ...
 */
async function parseSentences(sentencesPath) {
  console.log('[examples] Parsing sentences...');
  
  const chineseSentences = new Map();  // id -> text
  const englishSentences = new Map();  // id -> text
  
  const fileStream = fs.createReadStream(sentencesPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) {
      console.log(`[examples] Parsed ${lineCount} lines...`);
    }
    
    if (!line.trim() || line.startsWith('#')) continue;
    
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    
    const [id, lang, text] = parts;
    
    if (lang === 'cmn') {  // Mandarin Chinese
      chineseSentences.set(id, text);
    } else if (lang === 'eng') {  // English
      englishSentences.set(id, text);
    }
  }
  
  console.log(`[examples] Found ${chineseSentences.size} Chinese sentences`);
  console.log(`[examples] Found ${englishSentences.size} English sentences`);
  
  return { chineseSentences, englishSentences };
}

/**
 * Parse Tatoeba links file
 * Format: id1 [tab] id2 [tab] ...
 */
async function parseLinks(linksPath, chineseIds, englishIds) {
  console.log('[examples] Parsing links...');
  
  const pairs = [];  // { chineseId, englishId }
  
  const fileStream = fs.createReadStream(linksPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 1000000 === 0) {
      console.log(`[examples] Parsed ${lineCount} link lines...`);
    }
    
    if (!line.trim() || line.startsWith('#')) continue;
    
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    
    const [id1, id2] = parts;
    
    // Check if this is a Chinese-English pair
    if (chineseIds.has(id1) && englishIds.has(id2)) {
      pairs.push({ chineseId: id1, englishId: id2 });
    } else if (chineseIds.has(id2) && englishIds.has(id1)) {
      pairs.push({ chineseId: id2, englishId: id1 });
    }
  }
  
  console.log(`[examples] Found ${pairs.length} Chinese-English pairs`);
  return pairs;
}

/**
 * Build example sentences database
 */
async function buildExamples() {
  console.log('📚 Building example sentences database from Tatoeba...\n');
  console.log('Data source: Tatoeba.org (CC BY 2.0 FR)');
  console.log('Attribution: Example sentences from Tatoeba.org\n');

  // Create directories
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Download Tatoeba data
  const sentencesTar = path.join(TEMP_DIR, SENTENCES_FILE);
  const linksTar = path.join(TEMP_DIR, LINKS_FILE);
  const sentencesPath = path.join(TEMP_DIR, 'sentences.csv');
  const linksPath = path.join(TEMP_DIR, 'links.csv');

  // Check if already downloaded
  if (!fs.existsSync(sentencesPath)) {
    if (!fs.existsSync(sentencesTar)) {
      if (!download(TATOEBA_BASE_URL + SENTENCES_FILE, sentencesTar)) {
        console.error('[examples] Failed to download sentences');
        process.exit(1);
      }
    }
    if (!extractTarBz2(sentencesTar, TEMP_DIR)) {
      console.error('[examples] Failed to extract sentences');
      process.exit(1);
    }
  }

  if (!fs.existsSync(linksPath)) {
    if (!fs.existsSync(linksTar)) {
      if (!download(TATOEBA_BASE_URL + LINKS_FILE, linksTar)) {
        console.error('[examples] Failed to download links');
        process.exit(1);
      }
    }
    if (!extractTarBz2(linksTar, TEMP_DIR)) {
      console.error('[examples] Failed to extract links');
      process.exit(1);
    }
  }

  // Load word list
  const wordList = loadWordList();
  if (wordList.length === 0) {
    console.error('[examples] No words loaded');
    process.exit(1);
  }

  // Parse Tatoeba data
  const { chineseSentences, englishSentences } = await parseSentences(sentencesPath);
  const pairs = await parseLinks(linksPath, chineseSentences, englishSentences);

  // Build sentence pairs
  console.log('[examples] Building sentence pairs...');
  const sentencePairs = [];
  
  for (const pair of pairs) {
    const chinese = chineseSentences.get(pair.chineseId);
    const english = englishSentences.get(pair.englishId);
    
    if (chinese && english) {
      sentencePairs.push({ chinese, english });
    }
  }
  
  console.log(`[examples] Built ${sentencePairs.length} sentence pairs`);

  // Match words to sentences
  console.log('[examples] Matching words to sentences (this may take a few minutes)...');
  const examplesByWord = new Map();
  let processedCount = 0;
  
  for (const sentence of sentencePairs) {
    processedCount++;
    if (processedCount % 10000 === 0) {
      console.log(`[examples] Processed ${processedCount}/${sentencePairs.length} sentences...`);
    }
    
    for (const word of wordList) {
      if (sentence.chinese.includes(word)) {
        if (!examplesByWord.has(word)) {
          examplesByWord.set(word, []);
        }
        
        const examples = examplesByWord.get(word);
        if (examples.length < MAX_EXAMPLES_PER_WORD) {
          const pinyinText = generatePinyin(sentence.chinese);
          const difficulty = estimateDifficulty(sentence.chinese);
          
          examples.push({
            word,
            chinese: sentence.chinese,
            pinyin: pinyinText,
            english: sentence.english,
            difficulty,
          });
        }
      }
    }
    
    // Stop if we have enough examples
    if (examplesByWord.size >= MAX_WORDS) {
      let totalExamples = 0;
      for (const examples of examplesByWord.values()) {
        totalExamples += examples.length;
      }
      if (totalExamples >= MAX_TOTAL_EXAMPLES) {
        console.log(`[examples] Reached target of ${MAX_TOTAL_EXAMPLES} examples`);
        break;
      }
    }
  }

  // Convert to array for JSON output
  const allExamples = [];
  for (const [word, examples] of examplesByWord) {
    // Sort by difficulty
    examples.sort((a, b) => a.difficulty - b.difficulty);
    allExamples.push(...examples);
  }

  console.log(`\n[examples] Generated ${allExamples.length} example sentences for ${examplesByWord.size} words`);

  // Write output
  const outputPath = path.join(OUT_DIR, 'examples.json');
  fs.writeFileSync(outputPath, JSON.stringify(allExamples));
  
  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ ${outputPath} (${sizeMB} MB)\n`);

  console.log('✅ Example sentences build complete!');
  console.log(`   Words with examples: ${examplesByWord.size}`);
  console.log(`   Total examples: ${allExamples.length}`);
  console.log(`   File size: ${sizeMB} MB`);
  console.log('\n📄 Attribution: Example sentences from Tatoeba.org (CC BY 2.0 FR)');

  // Cleanup temp files
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log('[examples] Cleaned up temporary files');
  } catch (error) {
    console.warn('[examples] Failed to cleanup temp files:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  buildExamples().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { buildExamples };
