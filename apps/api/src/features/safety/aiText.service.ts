/**
 * Lightweight AI-text heuristic. Returns a 0..1 score where higher = more likely
 * machine-generated. This is **not** a verdict — it's a soft signal for moderators.
 *
 * Combines three cheap signals known to over-index on LLM output:
 *  - Function-word ratio (LLMs slightly under-use connective tissue vs humans)
 *  - Sentence-length variance (LLMs produce more uniform sentence lengths)
 *  - Bigram entropy (LLMs repeat common bigrams more often)
 */

const FUNCTION_WORDS = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by","from","as","is","are","was","were",
  "be","been","being","have","has","had","do","does","did","not","that","this","these","those","it","its","i","you",
  "he","she","we","they","them","his","her","their","my","your","our","if","then","than","so","because","while",
  "when","where","what","which","who","how","why","there","here",
]);

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/<[^>]+>/g, " ").replace(/[^a-z\s.!?]/g, " ").split(/\s+/).filter(Boolean);
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
}

export function aiTextScore(text: string): number {
  const t = tokens(text);
  if (t.length < 80) return 0; // too short to score reliably

  // 1. Function word ratio: humans typically 45-55%, LLMs trend slightly lower (~38-46%)
  const fnCount = t.filter((w) => FUNCTION_WORDS.has(w)).length;
  const fnRatio = fnCount / t.length;
  const fnSignal = Math.max(0, Math.min(1, (0.5 - fnRatio) / 0.15));

  // 2. Sentence length variance: humans vary widely
  const sentences = text.split(/[.!?]+/).map((s) => s.trim().split(/\s+/).length).filter((n) => n > 0);
  const v = variance(sentences);
  const meanLen = sentences.reduce((a, b) => a + b, 0) / Math.max(1, sentences.length);
  const cv = meanLen > 0 ? Math.sqrt(v) / meanLen : 0;
  const varianceSignal = Math.max(0, Math.min(1, (0.45 - cv) / 0.45));

  // 3. Bigram repetition: distinct bigrams / total bigrams
  const bigrams: string[] = [];
  for (let i = 0; i < t.length - 1; i++) bigrams.push(`${t[i]} ${t[i + 1]}`);
  const distinct = new Set(bigrams).size;
  const bigramSignal = bigrams.length > 0 ? Math.max(0, Math.min(1, (0.85 - distinct / bigrams.length) / 0.4)) : 0;

  const composite = 0.4 * fnSignal + 0.35 * varianceSignal + 0.25 * bigramSignal;
  return Math.round(composite * 1000) / 1000;
}
