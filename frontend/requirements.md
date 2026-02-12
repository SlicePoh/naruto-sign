# Naruto Hand Sign Recognition – Mini AI Project

## Project Goal

Build a browser-based AI application that:

* Detects hand landmarks from the webcam in real time
* Classifies Naruto hand signs
* Detects a predefined sign sequence
* Triggers a 3D animated jutsu effect

### Initial Scope (MVP)

Implement **only one jutsu**:

**Shadow Clone Jutsu**
Sequence: `Tiger → Ram → Snake`

The entire system must run client-side. No backend.

---

# Tech Stack

## Core Stack

* React + TypeScript (existing Vite project)
* MediaPipe Hands (JavaScript)
* react-three-fiber (Three.js wrapper)
* Native WebRTC (getUserMedia)
* Zustand (or Context + Reducer) for global state

## Constraints

* No backend
* No Python
* No external AI APIs
* Everything must run in-browser

---

# High-Level Architecture

Use a modular folder structure:

```
src/
 ├── camera/
 │    └── useCamera.ts
 ├── handTracking/
 │    └── useHandLandmarks.ts
 ├── classifier/
 │    ├── extractFeatures.ts
 │    ├── ruleClassifier.ts
 │    └── types.ts
 ├── jutsuEngine/
 │    ├── sequenceDetector.ts
 │    ├── jutsuRegistry.ts
 │    └── useJutsuEngine.ts
 ├── effects/
 │    └── ShadowClone.tsx
 ├── scene/
 │    └── ThreeScene.tsx
 ├── store/
 │    └── useAppStore.ts
 └── App.tsx
```

### Separation of Responsibilities

* Camera layer → provides video stream
* Hand tracking layer → produces landmarks
* Feature extraction → converts landmarks to structured data
* Classifier → outputs sign label
* Sequence engine → detects jutsu
* Store → manages state transitions
* Scene layer → renders effects

---

# Phase 1 – Webcam Setup

## `useCamera.ts`

Responsibilities:

* Request webcam access
* Attach stream to `<video>` element
* Handle permission errors
* Cleanup on unmount

Requirements:

* Autoplay
* Muted
* playsInline
* Resolution: 640x480 or 720p

Avoid reinitializing stream on every render.

---

# Phase 2 – Hand Tracking

## `useHandLandmarks.ts`

Use MediaPipe Hands.

Responsibilities:

* Initialize MediaPipe once
* Accept video element reference
* Run detection in requestAnimationFrame loop
* Return:

  * 21 landmark coordinates
  * Confidence score

Landmark type:

```
type Landmark = {
  x: number
  y: number
  z: number
}
```

Performance Notes:

* Do not trigger React state updates every frame
* Only update when landmarks meaningfully change
* Keep heavy logic outside render cycle

---

# Phase 3 – Feature Extraction

## `extractFeatures.ts`

Input:

* Array of 21 landmarks

Output:

* Normalized feature vector (`number[]`)

Extract the following features:

* Finger bend angles (MCP, PIP joints)
* Distance between fingertips
* Thumb-to-index distance
* Palm orientation
* Finger extension states (boolean → 0/1)

Normalization Strategy:

* Distances relative to palm width
* Angles divided by 180°
* Clamp values between 0–1

Keep this module pure and stateless.

---

# Phase 4 – Rule-Based Sign Classifier

## `ruleClassifier.ts`

Input:

* Feature vector

Output:

* "tiger" | "ram" | "snake" | "unknown"

For MVP implement:

* Tiger
* Ram
* Snake

Use threshold-based detection.

Example pattern:

```
If:
  index + middle extended
  ring + pinky bent
  thumb tucked
Then:
  Tiger
```

Return "unknown" when no confident match.

Keep rules readable and isolated.

---

# Phase 5 – Jutsu Engine

## Jutsu Registry

`jutsuRegistry.ts`

```
export const JUTSUS = {
  shadowClone: ["tiger", "ram", "snake"]
}
```

---

## `sequenceDetector.ts`

Responsibilities:

* Maintain rolling buffer of detected signs
* Ignore duplicate rapid detections
* Enforce timeout between signs (2–3 seconds)
* Compare buffer with registered jutsu sequence
* Trigger event when full sequence matches

Implementation Details:

* Buffer size: 3
* Reset buffer after success
* Reset buffer if timeout exceeded
* Avoid React state inside detector

Keep logic framework-agnostic.

---

# Phase 6 – Global State

## `useAppStore.ts`

Global state structure:

```
{
  currentSign: string
  signBuffer: string[]
  activeJutsu: "shadowClone" | null
}
```

Rules:

* On successful sequence match → set activeJutsu
* After 3–5 seconds → auto-clear activeJutsu
* Do not cause frame-by-frame rerenders

Zustand recommended for simplicity.

---

# Phase 7 – 3D Scene Layer

## `ThreeScene.tsx`

Responsibilities:

* Render webcam feed as background texture
* Mount jutsu effects conditionally

Structure:

```
<Canvas>
  <VideoPlane />
  {activeJutsu === "shadowClone" && <ShadowClone />}
</Canvas>
```

---

# Shadow Clone Effect

## `ShadowClone.tsx`

Goal:

Simulate multiple clones appearing behind the user.

MVP Implementation:

* Duplicate video plane mesh
* Render 3 additional meshes
* Offset clones on X-axis
* Reduce opacity
* Add slight animated delay

Optional Advanced Version:

* Afterimage trail effect
* Subtle distortion shader

Keep initial implementation simple.

---

# Data Flow

```
Webcam
   ↓
MediaPipe Hands
   ↓
Landmarks
   ↓
extractFeatures
   ↓
ruleClassifier → Sign
   ↓
sequenceDetector → Jutsu Trigger
   ↓
Global Store
   ↓
3D Effect Render
```

---

# Performance Targets

* Maintain 30–60 FPS
* Avoid updating React state every frame
* Only update on sign change
* Memoize heavy computations
* Keep math outside JSX

---

# MVP Completion Criteria

The MVP is complete when:

* Tiger, Ram, Snake signs are reliably detected
* Performing Tiger → Ram → Snake within 2–3 seconds triggers Shadow Clone
* Shadow Clone animation renders correctly
* Everything runs entirely in the browser

Focus on stability first. Visual polish comes later.

---

# Future Extensions (Post-MVP)

* Replace rule classifier with TensorFlow.js model
* Add training mode to collect custom sign data
* Add sound effects
* Add cooldown system
* Add chakra meter
* Add more jutsu

Build the system modular so adding more jutsu later requires only:

* Adding new sign rules
* Adding new sequence entry
* Adding new effect component
