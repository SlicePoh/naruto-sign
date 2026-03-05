import type { HandLandmarks } from './types';

/**
 * Extract the same 80-dimensional feature vector from one hand
 * that the Python training pipeline (main.py / api.py) computes.
 *
 *   63  normalized relative deltas  (21 landmarks × 3)
 *   10  joint angles
 *    4  fingertip pair distances
 *    3  palm normal vector
 *  ───
 *   80  total
 */
export function extractModelFeatures(hand: HandLandmarks): number[] {
  const coords = hand.map((lm) => [lm.x, lm.y, lm.z]);
  const wrist = coords[0];
  const middleMcp = coords[9];
  const handSize = vecLen(vecSub(middleMcp, wrist)) + 1e-6;

  const features: number[] = [];

  // 1) normalized relative deltas (21 × 3 = 63)
  for (const pt of coords) {
    const delta = vecScale(vecSub(pt, wrist), 1 / handSize);
    features.push(delta[0], delta[1], delta[2]);
  }

  // 2) joint angles (10)
  const fingerTriplets: [number, number, number][] = [
    [1, 2, 3], [2, 3, 4],
    [5, 6, 7], [6, 7, 8],
    [9, 10, 11], [10, 11, 12],
    [13, 14, 15], [14, 15, 16],
    [17, 18, 19], [18, 19, 20],
  ];
  for (const [a, b, c] of fingerTriplets) {
    const ba = vecSub(coords[a], coords[b]);
    const bc = vecSub(coords[c], coords[b]);
    const cosAngle = vecDot(ba, bc) / (vecLen(ba) * vecLen(bc) + 1e-6);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    features.push((angle * 180) / Math.PI / 180); // degrees / 180
  }

  // 3) fingertip distances (4)
  const tipPairs: [number, number][] = [[4, 8], [8, 12], [12, 16], [16, 20]];
  for (const [a, b] of tipPairs) {
    features.push(vecLen(vecSub(coords[a], coords[b])) / handSize);
  }

  // 4) palm normal vector (3)
  const v1 = vecSub(coords[9], wrist);
  const v2 = vecSub(coords[17], wrist);
  const normal = vecCross(v1, v2);
  const nLen = vecLen(normal) + 1e-6;
  features.push(normal[0] / nLen, normal[1] / nLen, normal[2] / nLen);

  return features; // 80
}

/**
 * Build the full 161-dim combined feature vector from up to 2 hands,
 * exactly matching the Python backend logic.
 */
export function buildCombinedFeatures(hands: HandLandmarks[]): number[] {
  let leftFeatures = new Array<number>(80).fill(0);
  let rightFeatures = new Array<number>(80).fill(0);

  // Browser MediaPipe doesn't give handedness reliably;
  // use detection order: index 0 = left, index 1 = right (matches training)
  if (hands.length >= 1 && hands[0].length === 21) {
    leftFeatures = extractModelFeatures(hands[0]);
  }
  if (hands.length >= 2 && hands[1].length === 21) {
    rightFeatures = extractModelFeatures(hands[1]);
  }

  const combined = [...leftFeatures, ...rightFeatures]; // 160

  // wrist-to-wrist distance (feature 161)
  if (hands.length >= 2 && hands[0].length === 21 && hands[1].length === 21) {
    const lw = [hands[0][0].x, hands[0][0].y, hands[0][0].z];
    const rw = [hands[1][0].x, hands[1][0].y, hands[1][0].z];
    combined.push(vecLen(vecSub(lw, rw)));
  } else {
    combined.push(0);
  }

  return combined; // 161
}

// ── tiny vec3 helpers ────────────────────────────────────────────────

function vecSub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function vecScale(v: number[], s: number): number[] {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function vecDot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function vecLen(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function vecCross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}


// https://jutsu-ai.vercel.app/`