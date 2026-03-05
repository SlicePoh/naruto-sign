import type { SignLabel } from './types';

/**
 * In-browser Random Forest classifier.
 *
 * Loads the JSON file exported by `backend/export_model_to_json.py`
 * and evaluates the full ensemble (~400 trees) synchronously.
 * This eliminates the HTTP round-trip to the Python backend and makes
 * classification as fast as the native Python loop.
 */

// ── JSON shape coming from the export script ─────────────────────────
interface TreeNode {
  /** feature index (-1 = leaf) */
  f: number;
  /** threshold */
  t: number;
  /** left child index */
  l: number;
  /** right child index */
  r: number;
  /** class probability distribution (only on leaves) */
  v: number[] | null;
}

interface ModelJson {
  classes: string[];
  n_features: number;
  trees: TreeNode[][];
}

// ── Module state ─────────────────────────────────────────────────────
let _model: ModelJson | null = null;
let _loading: Promise<void> | null = null;

/**
 * Load the model JSON once (idempotent). Call early (e.g. in App mount).
 */
export async function loadModel(url = '/hand_sign_model.json'): Promise<void> {
  if (_model) return;
  if (_loading) return _loading;

  _loading = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load model: ${res.status}`);
    _model = (await res.json()) as ModelJson;
    console.log(
      `🌲 RF model loaded: ${_model.trees.length} trees, ` +
      `${_model.classes.length} classes (${_model.classes.join(', ')})`,
    );
  })();

  return _loading;
}

export function isModelLoaded(): boolean {
  return _model !== null;
}

// ── Prediction ───────────────────────────────────────────────────────

export interface LocalPrediction {
  sign: SignLabel;
  confidence: number;
}

/**
 * Predict a sign from a 161-dim feature vector (synchronous, ~1-2 ms).
 */
export function predictLocal(features: number[], confThreshold = 0.60): LocalPrediction {
  if (!_model) throw new Error('Model not loaded — call loadModel() first');

  const nClasses = _model.classes.length;
  // Accumulate votes (probability distributions) across all trees
  const votes = new Float64Array(nClasses);

  for (const tree of _model.trees) {
    let idx = 0;
    // Walk the tree until a leaf
    while (tree[idx].f !== -1) {
      const node = tree[idx];
      idx = features[node.f] <= node.t ? node.l : node.r;
    }
    // Leaf — add its probability distribution
    const probs = tree[idx].v!;
    for (let c = 0; c < nClasses; c++) {
      votes[c] += probs[c];
    }
  }

  // Average across trees
  const nTrees = _model.trees.length;
  let bestIdx = 0;
  let bestScore = -1;
  for (let c = 0; c < nClasses; c++) {
    votes[c] /= nTrees;
    if (votes[c] > bestScore) {
      bestScore = votes[c];
      bestIdx = c;
    }
  }

  const prediction = _model.classes[bestIdx];
  const confidence = bestScore;

  return {
    sign: (confidence < confThreshold ? 'neutral' : prediction) as SignLabel,
    confidence,
  };
}
