import type { HandLandmarks, Features } from './types';

/**
 * Extracts normalized features from hand landmarks
 * Features include finger extensions, bends, distances, and palm orientation
 */
export function extractFeatures(landmarks: HandLandmarks): Features {
  if (!landmarks || landmarks.length !== 21) {
    throw new Error('Invalid landmarks: expected 21 points');
  }

  // Calculate palm width for normalization (distance from wrist to middle finger MCP)
  const palmWidth = distance3D(landmarks[0], landmarks[9]);

  // Extract finger extension states (0 = bent, 1 = extended)
  const fingerExtensions = [
    getFingerExtension(landmarks, 1, 4, palmWidth),   // Thumb
    getFingerExtension(landmarks, 5, 8, palmWidth),   // Index
    getFingerExtension(landmarks, 9, 12, palmWidth),  // Middle
    getFingerExtension(landmarks, 13, 16, palmWidth), // Ring
    getFingerExtension(landmarks, 17, 20, palmWidth), // Pinky
  ];

  // Calculate finger bend angles at MCP and PIP joints
  const fingerBends = [
    getFingerBendAngle(landmarks, 1, 2, 3, 4),   // Thumb
    getFingerBendAngle(landmarks, 5, 6, 7, 8),   // Index
    getFingerBendAngle(landmarks, 9, 10, 11, 12), // Middle
    getFingerBendAngle(landmarks, 13, 14, 15, 16), // Ring
    getFingerBendAngle(landmarks, 17, 18, 19, 20), // Pinky
  ];

  // Distance between thumb tip and index tip (normalized)
  const thumbIndexDistance = distance3D(landmarks[4], landmarks[8]) / palmWidth;

  // Palm orientation (angle of palm plane)
  const palmOrientation = getPalmOrientation(landmarks);

  // Distances between consecutive fingertips
  const fingertipDistances = [
    distance3D(landmarks[4], landmarks[8]) / palmWidth,  // Thumb to Index
    distance3D(landmarks[8], landmarks[12]) / palmWidth, // Index to Middle
    distance3D(landmarks[12], landmarks[16]) / palmWidth, // Middle to Ring
    distance3D(landmarks[16], landmarks[20]) / palmWidth, // Ring to Pinky
  ];

  return {
    fingerExtensions,
    fingerBends,
    thumbIndexDistance,
    palmOrientation,
    fingertipDistances,
  };
}

/**
 * Calculate 3D Euclidean distance between two landmarks
 */
function distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

/**
 * Determine if a finger is extended based on tip-to-base distance
 */
function getFingerExtension(
  landmarks: HandLandmarks,
  baseIdx: number,
  tipIdx: number,
  palmWidth: number
): number {
  const dist = distance3D(landmarks[baseIdx], landmarks[tipIdx]);
  const normalized = dist / palmWidth;
  
  // Threshold: >0.6 is extended, <0.4 is bent, interpolate in between
  return clamp((normalized - 0.4) / 0.2, 0, 1);
}

/**
 * Calculate bend angle for a finger using 4 points
 */
function getFingerBendAngle(
  landmarks: HandLandmarks,
  idx1: number,
  idx2: number,
  idx3: number,
  idx4: number
): number {
  // Calculate vectors
  const v1 = {
    x: landmarks[idx2].x - landmarks[idx1].x,
    y: landmarks[idx2].y - landmarks[idx1].y,
    z: landmarks[idx2].z - landmarks[idx1].z,
  };
  
  const v2 = {
    x: landmarks[idx4].x - landmarks[idx3].x,
    y: landmarks[idx4].y - landmarks[idx3].y,
    z: landmarks[idx4].z - landmarks[idx3].z,
  };

  // Calculate angle between vectors
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  const angle = Math.acos(dot / (mag1 * mag2));
  
  // Normalize to 0-1 (0 = straight, 1 = fully bent)
  return clamp(angle / Math.PI, 0, 1);
}

/**
 * Calculate palm orientation from wrist, index MCP, and pinky MCP
 */
function getPalmOrientation(landmarks: HandLandmarks): number {
  const wrist = landmarks[0];
  const indexMCP = landmarks[5];
  const pinkyMCP = landmarks[17];

  // Calculate normal vector of palm plane
  const v1 = {
    x: indexMCP.x - wrist.x,
    y: indexMCP.y - wrist.y,
    z: indexMCP.z - wrist.z,
  };
  
  const v2 = {
    x: pinkyMCP.x - wrist.x,
    y: pinkyMCP.y - wrist.y,
    z: pinkyMCP.z - wrist.z,
  };

  // Cross product
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };

  // Return normalized z component (facing camera vs away)
  const magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  return normal.z / magnitude;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
