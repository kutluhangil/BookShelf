import { describe, expect, it } from 'vitest';
import {
  normalizeSpineText,
  calculateSimilarity,
  scoreToConfidence,
  buildCandidatesFromRecognition,
} from '../services/clusteringEngine';

describe('normalizeSpineText', () => {
  it('folds Turkish characters and strips publisher noise', () => {
    expect(normalizeSpineText('İSTANBUL Yayınları')).toBe('istanbul');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeSpineText('')).toBe('');
  });
});

describe('calculateSimilarity', () => {
  it('scores identical strings as 1', () => {
    expect(calculateSimilarity('Dune', 'Dune')).toBe(1);
  });

  it('never exceeds 1', () => {
    expect(calculateSimilarity('Moby Dick', 'Moby Dick or the Whale')).toBeLessThanOrEqual(1);
  });

  it('scores unrelated strings low', () => {
    expect(calculateSimilarity('Dune', 'Cooking with Fire')).toBeLessThan(0.3);
  });
});

describe('scoreToConfidence', () => {
  it('maps scores into the three confidence bands', () => {
    expect(scoreToConfidence(0.95)).toBe('matched');
    expect(scoreToConfidence(0.6)).toBe('review');
    expect(scoreToConfidence(0.1)).toBe('unknown');
  });
});

describe('buildCandidatesFromRecognition', () => {
  it('produces one candidate per recognized spine with clamped geometry', () => {
    const candidates = buildCandidatesFromRecognition('data:image/jpeg;base64,AAA', [
      { rawText: 'Dune Frank Herbert', confidence: 0.95, dominantColor: '#112233', bbox: { x: -5, y: 10, width: 200, height: 80 } },
      { rawText: '', confidence: 0.05 },
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].bbox.x).toBe(0);
    expect(candidates[0].bbox.width).toBe(100);
    expect(candidates[0].dominantColor).toBe('#112233');
    expect(candidates[0].confidence).toBe('matched');
    expect(candidates[1].confidence).toBe('unknown');
    expect(candidates[1].matchedBook).toBeUndefined();
  });

  it('gives every candidate a unique matched book id', () => {
    const candidates = buildCandidatesFromRecognition('img', [
      { rawText: 'Dune Frank Herbert', confidence: 0.95 },
      { rawText: 'Dune Frank Herbert', confidence: 0.95 },
    ]);
    const ids = candidates.map((c) => c.matchedBook?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
