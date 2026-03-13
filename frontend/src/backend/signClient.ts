import type { HandLandmarks, SignLabel } from '../classifier/types';

export interface BackendPredictResponse {
  sign: SignLabel;
  confidence: number;
  method: 'rule' | 'model';
  hands: number;
  jutsu?: string | null;
  chakra_state?: string | null;
}

export interface HealthResponse {
  status: string;
  model_classes: string[];
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const res = await fetch(`${getBaseUrl()}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return (await res.json()) as HealthResponse;
}

type Landmark = { x: number; y: number; z: number };

type PredictLandmarksRequest = {
  hands: Landmark[][];
};

const DEFAULT_BASE_URL = '/api';

export function getBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_BASE_URL as string | undefined;
  return (envUrl && envUrl.trim()) ? envUrl.trim().replace(/\/$/, '') : DEFAULT_BASE_URL;
}

export async function predictSignFromLandmarks(
  hands: HandLandmarks[],
  signal?: AbortSignal
): Promise<BackendPredictResponse> {
  const body: PredictLandmarksRequest = {
    hands: (hands ?? []).map((hand) => hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))),
  };

  const res = await fetch(`${getBaseUrl()}/predict/landmarks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Backend /predict/landmarks failed: ${res.status}`);
  }

  return (await res.json()) as BackendPredictResponse;
}
