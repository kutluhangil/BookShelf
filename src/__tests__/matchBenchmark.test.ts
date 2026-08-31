import { describe, expect, it } from 'vitest';
import { runBenchmark, measureSample } from '../services/matchBenchmark';
import { SPIKE_DATASET } from '../data/spikeDataset';

describe('matchBenchmark', () => {
  it('produces one measurement per sample', () => {
    const result = runBenchmark(SPIKE_DATASET);
    expect(result.samples).toHaveLength(SPIKE_DATASET.length);
  });

  it('keeps every rate inside 0..1', () => {
    for (const sample of SPIKE_DATASET) {
      const m = measureSample(sample);
      for (const rate of [m.coverage, m.matchAccuracy, m.ambiguityRate]) {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never reports more covered books than the sample contains', () => {
    for (const sample of SPIKE_DATASET) {
      const m = measureSample(sample);
      expect(m.coveredCount).toBeLessThanOrEqual(m.expectedCount);
      expect(m.expectedCount).toBe(sample.groundTruth.length);
    }
  });

  it('measures the matcher rather than comparing ground truth to itself', () => {
    // The earlier version scored the demo generator's own output, so accuracy
    // was 1.0 for every sample by construction. Coverage must now vary with how
    // much of each sample the small bundled catalog actually knows.
    const result = runBenchmark(SPIKE_DATASET);
    const distinctCoverage = new Set(result.samples.map((s) => s.coverage.toFixed(4)));
    expect(distinctCoverage.size).toBeGreaterThan(1);
    expect(result.totals.coverage).toBeLessThan(1);
  });

  it('finds the right entry for a book the catalog does contain', () => {
    const known = SPIKE_DATASET.flatMap((s) => s.groundTruth).find((b) => b.title === 'Dune');
    expect(known).toBeDefined();
    const sample = { ...SPIKE_DATASET[0], groundTruth: [known!] };
    const m = measureSample(sample);
    expect(m.coveredCount).toBe(1);
    expect(m.matchAccuracy).toBe(1);
  });

  it('reports zero accuracy, not a crash, when nothing is covered', () => {
    const sample = {
      ...SPIKE_DATASET[0],
      groundTruth: [{ title: 'Zzz Unknown Volume', author: 'Nobody', year: 2000, publisher: 'None', color: '#000000' }],
    };
    const m = measureSample(sample);
    expect(m.coveredCount).toBe(0);
    expect(m.matchAccuracy).toBe(0);
    expect(m.coverage).toBe(0);
  });

  it('weights totals by covered books, not by sample count', () => {
    const result = runBenchmark(SPIKE_DATASET);
    expect(result.totals.coveredCount).toBe(
      result.samples.reduce((sum, s) => sum + s.coveredCount, 0)
    );
  });
});
