import { SpikeSample } from '../types';
import { rankCatalogEntries, catalogSize, calculateSimilarity } from './clusteringEngine';

/**
 * Measures the local catalog matching layer against the bundled samples' known
 * ground truth, replacing hard-coded numbers that never ran anything.
 *
 * It deliberately measures the matcher itself: given the text a spine would
 * yield, does the trigram ranker put the right catalog entry first? It does not
 * measure spine detection, which runs on the server-side vision model.
 *
 * Books absent from the small bundled catalog cannot be matched at all, so
 * coverage is reported separately instead of being folded into accuracy — which
 * would otherwise punish the ranker for a catalog gap.
 */

const AMBIGUITY_MARGIN = 0.08;

export interface SampleMeasurement {
  sampleId: string;
  expectedCount: number;
  /** Ground-truth books that exist in the local catalog at all. */
  coveredCount: number;
  coverage: number;
  /** Top-1 accuracy over the covered books. */
  matchAccuracy: number;
  /** Covered books where the runner-up scored within AMBIGUITY_MARGIN. */
  ambiguousCount: number;
  ambiguityRate: number;
  durationMs: number;
}

export interface BenchmarkResult {
  samples: SampleMeasurement[];
  catalogSize: number;
  totals: {
    expectedCount: number;
    coveredCount: number;
    coverage: number;
    matchAccuracy: number;
    ambiguityRate: number;
    durationMs: number;
  };
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function titlesEqual(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}

/** A book counts as covered when some catalog entry is clearly the same title. */
function isCovered(title: string, author: string): boolean {
  return rankCatalogEntries(`${title} ${author}`, 5).some(
    (candidate) => titlesEqual(candidate.entry.title, title) || calculateSimilarity(candidate.entry.title, title) >= 0.85
  );
}

export function measureSample(sample: SpikeSample): SampleMeasurement {
  const started = performance.now();

  let covered = 0;
  let correct = 0;
  let ambiguous = 0;

  for (const truth of sample.groundTruth) {
    if (!isCovered(truth.title, truth.author)) continue;
    covered++;

    // The text a spine realistically yields: title and author, nothing else.
    const ranked = rankCatalogEntries(`${truth.title} ${truth.author}`, 2);
    const best = ranked[0];
    const runnerUp = ranked[1];

    if (best && titlesEqual(best.entry.title, truth.title)) correct++;
    if (best && runnerUp && best.score - runnerUp.score < AMBIGUITY_MARGIN) ambiguous++;
  }

  const expectedCount = sample.groundTruth.length;

  return {
    sampleId: sample.id,
    expectedCount,
    coveredCount: covered,
    coverage: expectedCount === 0 ? 0 : covered / expectedCount,
    matchAccuracy: covered === 0 ? 0 : correct / covered,
    ambiguousCount: ambiguous,
    ambiguityRate: covered === 0 ? 0 : ambiguous / covered,
    durationMs: performance.now() - started,
  };
}

export function runBenchmark(samples: SpikeSample[]): BenchmarkResult {
  const measurements = samples.map(measureSample);

  const expectedCount = measurements.reduce((sum, entry) => sum + entry.expectedCount, 0);
  const coveredCount = measurements.reduce((sum, entry) => sum + entry.coveredCount, 0);

  // Weighted by the number of books each sample actually contributes, so a
  // one-book sample cannot swing the headline like an average of averages would.
  const weightedByCovered = (pick: (entry: SampleMeasurement) => number) =>
    coveredCount === 0
      ? 0
      : measurements.reduce((sum, entry) => sum + pick(entry) * entry.coveredCount, 0) / coveredCount;

  return {
    samples: measurements,
    catalogSize: catalogSize(),
    totals: {
      expectedCount,
      coveredCount,
      coverage: expectedCount === 0 ? 0 : coveredCount / expectedCount,
      matchAccuracy: weightedByCovered((entry) => entry.matchAccuracy),
      ambiguityRate: weightedByCovered((entry) => entry.ambiguityRate),
      durationMs: measurements.reduce((sum, entry) => sum + entry.durationMs, 0),
    },
  };
}
