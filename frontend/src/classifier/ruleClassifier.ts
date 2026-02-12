import type { Features, SignLabel } from './types';

/**
 * Rule-based classifier for Naruto hand signs
 * Uses simple, reliable finger counting logic with strict thresholds
 */
export function classifySign(features: Features): SignLabel {
  const [thumb, index, middle, ring, pinky] = features.fingerExtensions;
  
  const thumbExtended = thumb > 0.6;
  
  // IGNORE CASES - Return unknown for non-sign positions
  
  // If all fingers are in transitional/ambiguous state, ignore
  const allInTransition = [thumb, index, middle, ring, pinky].every(f => f > 0.3 && f < 0.6);
  if (allInTransition) {
    return 'unknown';
  }
  
  // If no clear finger positions (all in middle range), ignore
  const noDefinitePositions = [index, middle, ring, pinky].every(f => f > 0.35 && f < 0.65);
  if (noDefinitePositions && thumb > 0.35 && thumb < 0.65) {
    return 'unknown';
  }
  
  // If fingers are randomly positioned (no pattern), ignore
  const fingerVariance = Math.max(index, middle, ring, pinky) - Math.min(index, middle, ring, pinky);
  if (fingerVariance < 0.2) {
    // All fingers too similar - probably hand moving or transitioning
    return 'unknown';
  }
  
  // Log for debugging (throttled)
  if (Math.random() < 0.1) { // Only log 10% of frames
    console.log('Finger extensions:', { 
      thumb: thumb.toFixed(2), 
      index: index.toFixed(2), 
      middle: middle.toFixed(2), 
      ring: ring.toFixed(2), 
      pinky: pinky.toFixed(2) 
    });
  }

  // VALID SIGN DETECTION (with strict requirements)

  // Tiger: Index clearly extended, middle can be partially visible, ring + pinky clearly bent
  // (Middle finger hard to see from front camera angle)
  // IGNORE: if ring or pinky are extended (not a tiger)
  if (index > 0.65 && middle > 0.5 && ring < 0.35 && pinky < 0.35) {
    // Additional check: index and middle should be clearly different from ring/pinky
    const clearSeparation = (index - ring) > 0.3 && (middle - pinky) > 0.3;
    if (clearSeparation) {
      return 'tiger';
    }
  }

  // Ram: Similar to Tiger but can have slightly different finger positions
  // Single hand shows index up, middle partially up, ring/pinky vary
  // IGNORE: if it looks too much like Tiger or if fingers are too similar
  if (index > 0.7 && middle > 0.4 && middle < 0.7 && (ring < 0.5 || pinky < 0.5)) {
    // Make sure it's distinct from Tiger (at least one of ring/pinky more bent)
    const differentFromTiger = ring < 0.3 || pinky < 0.3 || middle < 0.6;
    if (differentFromTiger) {
      return 'ram';
    }
  }

  // Snake: All fingers moderately extended (not fully up, not fully down)
  // Looking for a "relaxed hand" position with all fingers visible
  // IGNORE: if it looks like Bird (all fully extended) or random positioning
  const allFingersModerate = 
    index > 0.5 && index < 0.8 && 
    middle > 0.5 && middle < 0.8 && 
    ring > 0.5 && ring < 0.8 && 
    pinky > 0.5 && pinky < 0.8;
  
  const thumbModerate = thumb > 0.4 && thumb < 0.75;
  
  // Make sure fingers are relatively uniform (not random)
  const fingerUniformity = Math.max(index, middle, ring, pinky) - Math.min(index, middle, ring, pinky);
  const isUniform = fingerUniformity < 0.3;
  
  if (allFingersModerate && thumbModerate && isUniform) {
    return 'snake';
  }

  // Bird/Tori: All fingers clearly extended
  // IGNORE: if not clearly all extended (prevent false positives)
  if (index > 0.7 && middle > 0.7 && ring > 0.7 && pinky > 0.7 && thumbExtended) {
    // All fingers must be clearly extended
    const allClearlyExtended = index > 0.75 && middle > 0.75 && ring > 0.75 && pinky > 0.75;
    if (allClearlyExtended) {
      return 'bird';
    }
  }

  // Fist/Boar: All fingers clearly closed
  // IGNORE: if any finger is partially extended (not a clean fist)
  if (index < 0.3 && middle < 0.3 && ring < 0.3 && pinky < 0.3 && thumb < 0.3) {
    // Verify it's a tight fist
    const allClearlyClosed = index < 0.25 && middle < 0.25 && ring < 0.25 && pinky < 0.25;
    if (allClearlyClosed) {
      return 'boar';
    }
  }

  // Ox: Thumb + Index extended, others clearly down
  // IGNORE: if middle finger is also extended (would be Dragon)
  if (thumbExtended && index > 0.7 && middle < 0.35 && ring < 0.35 && pinky < 0.35) {
    // Make sure middle is clearly down (not Dragon)
    if (middle < 0.4) {
      return 'ox';
    }
  }

  // Dragon: Thumb + Index + Middle extended, others down
  // IGNORE: if ring or pinky are also extended (would be Bird)
  if (thumbExtended && index > 0.7 && middle > 0.7 && ring < 0.35 && pinky < 0.35) {
    // Make sure ring and pinky are clearly down
    if (ring < 0.4 && pinky < 0.4) {
      return 'dragon';
    }
  }

  return 'unknown';
}
