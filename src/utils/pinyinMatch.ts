import { pinyin } from 'pinyin-pro';

export interface PinyinMatch {
    char: string;
    pinyin: string; // the original reading (with tones) that was matched
}

/**
 * Normalize a pinyin syllable for comparison:
 *   - lowercase
 *   - strip tone marks (ā á ǎ à → a, etc.)
 *   - map ü / ǖǘǚǜ → v
 *   - drop anything non a-z (numbers, spaces, apostrophes, hyphens)
 */
function normalize(py: string): string {
    return py
        .toLowerCase()
        .normalize('NFD')                  // split diacritics off
        .replace(/[\u0300-\u036f]/g, '')   // strip combining tone marks
        .replace(/[ǖǘǚǜü]/g, 'v')
        .replace(/[^a-z]/g, '');
}

/**
 * Align a concatenated pinyin string to a string of Chinese characters.
 *
 * Accepts pinyin with or without tones, spaces, apostrophes, or tone numbers.
 * Returns null if no valid alignment exists (usually means the inputs don't
 * actually correspond, or a character uses an unexpected reading).
 *
 * Non-Chinese characters in `chinese` (punctuation, latin, digits) are passed
 * through with an empty pinyin slot and do not consume input.
 */
export function matchPinyinToChars(
    chinese: string,
    pinyinStr: string,
): PinyinMatch[] | null {
    const chars = Array.from(chinese); // handle surrogate pairs safely
    const target = normalize(pinyinStr);

    // Precompute candidate readings per character.
    const readings: string[][] = chars.map((c) => {
        if (!/\p{Script=Han}/u.test(c)) return []; // non-Han: no pinyin
        const all = pinyin(c, {
            toneType: 'none',
            multiple: true,
            type: 'array',
        }) as string[];
        // Dedupe while preserving order (most common reading first).
        return Array.from(new Set(all));
    });

    function walk(i: number, pos: number, acc: PinyinMatch[]): PinyinMatch[] | null {
        if (i === chars.length) {
            return pos === target.length ? acc : null;
        }

        // Pass-through for non-Han characters (punctuation, spaces, latin, etc.)
        if (readings[i].length === 0) {
            return walk(i + 1, pos, [...acc, { char: chars[i], pinyin: '' }]);
        }

        for (const reading of readings[i]) {
            const n = normalize(reading);
            if (n && target.startsWith(n, pos)) {
                const next = walk(i + 1, pos + n.length, [
                    ...acc,
                    { char: chars[i], pinyin: reading },
                ]);
                if (next) return next;
            }
        }
        return null;
    }

    return walk(0, 0, []);
}

// ---------- Example ----------
// const result = matchPinyinToChars('我去银行取钱', "wǒ qù yínháng qǔ qián");
// → [
//     { char: '我', pinyin: 'wo' },
//     { char: '去', pinyin: 'qu' },
//     { char: '银', pinyin: 'yin' },
//     { char: '行', pinyin: 'hang' },   // correctly picks 'hang' over 'xing'
//     { char: '取', pinyin: 'qu' },
//     { char: '钱', pinyin: 'qian' },
//   ]