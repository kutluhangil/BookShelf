/**
 * SPINE Spike — Clustering & Segmentation Algorithm (§7.3)
 * Reference implementation for Phase 0 accuracy evaluation.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawOcrToken {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  rotationAngle: number; // 0, 90, 180, 270
}

export interface CandidateSpine {
  id: string;
  bbox: BoundingBox;
  tokens: RawOcrToken[];
  forwardText: string;
  reverseText: string;
  dominantColor: string;
  estimatedSpineWidth: number;
}

/**
 * 1. Filter Noise: drop single characters, non-alphanumeric tokens, and artifacts
 */
export function filterNoiseTokens(tokens: RawOcrToken[]): RawOcrToken[] {
  return tokens.filter((token) => {
    const cleaned = token.text.replace(/[^a-zA-Z0-9\u00C0-\u017F]/g, '').trim();
    return cleaned.length >= 2 && token.confidence >= 0.35;
  });
}

/**
 * 2. 1D Axis Projection: project OCR text block centers onto axis perpendicular to dominant spine orientation
 */
export function projectTokens1D(tokens: RawOcrToken[], dominantAngleDeg: number = 0): { token: RawOcrToken; axisPos: number }[] {
  const rad = (dominantAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return tokens.map((token) => {
    const centerX = token.bbox.x + token.bbox.width / 2;
    const centerY = token.bbox.y + token.bbox.height / 2;
    // Perpendicular axis coordinate
    const axisPos = centerX * cos + centerY * sin;
    return { token, axisPos };
  });
}

/**
 * 3. 1D Density Clustering & Wide Spine Subdivision (§7.3)
 */
export function clusterSpineCandidates(
  tokens: RawOcrToken[],
  dominantAngleDeg: number = 0,
  shelfWidth: number = 100
): CandidateSpine[] {
  const filtered = filterNoiseTokens(tokens);
  if (filtered.length === 0) return [];

  const projected = projectTokens1D(filtered, dominantAngleDeg).sort((a, b) => a.axisPos - b.axisPos);

  const clusters: RawOcrToken[][] = [];
  let currentCluster: RawOcrToken[] = [];
  const GAP_THRESHOLD = 5.0; // % of shelf width

  for (let i = 0; i < projected.length; i++) {
    const item = projected[i];
    if (currentCluster.length === 0) {
      currentCluster.push(item.token);
    } else {
      const prev = projected[i - 1];
      const gap = Math.abs(item.axisPos - prev.axisPos);
      if (gap > GAP_THRESHOLD) {
        clusters.push(currentCluster);
        currentCluster = [item.token];
      } else {
        currentCluster.push(item.token);
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Calculate median width for wide candidate subdivision
  const widths = clusters.map((c) => {
    const minX = Math.min(...c.map((t) => t.bbox.x));
    const maxX = Math.max(...c.map((t) => t.bbox.x + t.bbox.width));
    return maxX - minX;
  });
  const sortedWidths = [...widths].sort((a, b) => a - b);
  const medianWidth = sortedWidths[Math.floor(sortedWidths.length / 2)] || 8.0;

  const resultSpines: CandidateSpine[] = [];
  let spineCounter = 1;

  clusters.forEach((cluster) => {
    const minX = Math.min(...cluster.map((t) => t.bbox.x));
    const maxX = Math.max(...cluster.map((t) => t.bbox.x + t.bbox.width));
    const minY = Math.min(...cluster.map((t) => t.bbox.y));
    const maxY = Math.max(...cluster.map((t) => t.bbox.y + t.bbox.height));
    const totalWidth = maxX - minX;

    // Wide candidate division if > 1.8x median
    const divisions = totalWidth > medianWidth * 1.8 ? Math.round(totalWidth / medianWidth) : 1;
    const subWidth = totalWidth / divisions;

    for (let d = 0; d < divisions; d++) {
      const subX = minX + d * subWidth;
      const subTokens = cluster.filter((t) => {
        const cx = t.bbox.x + t.bbox.width / 2;
        return cx >= subX && cx <= subX + subWidth;
      });

      const forwardText = subTokens.map((t) => t.text).join(' ');
      const reverseText = [...subTokens].reverse().map((t) => t.text).join(' ');

      resultSpines.push({
        id: `spine-${spineCounter++}`,
        bbox: {
          x: subX,
          y: Math.max(0, minY - 4),
          width: subWidth,
          height: Math.min(100, (maxY - minY) + 8),
        },
        tokens: subTokens,
        forwardText,
        reverseText,
        dominantColor: '#C9963F',
        estimatedSpineWidth: subWidth,
      });
    }
  });

  return resultSpines;
}
