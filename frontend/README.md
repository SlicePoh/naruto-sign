# 🍥 Naruto Hand Sign Recognition

A browser-based AI application that detects Naruto hand signs in real-time and triggers 3D animated jutsu effects. Built entirely with client-side technologies - **no backend, no Python, no external APIs**.

## 🎯 Features

- **Real-time Hand Tracking**: Uses MediaPipe Hands (JavaScript) to detect 21 hand landmarks from your webcam
- **Rule-Based Sign Classification**: Detects three Naruto hand signs:
  - **Tiger** 🐅: Index and middle fingers extended
  - **Ram** 🐏: Index finger pointing up
  - **Snake** 🐍: Fingers intertwined
- **Sequence Detection**: Recognizes the Shadow Clone Jutsu sequence (Tiger → Ram → Snake)
- **3D Effects**: Renders animated Shadow Clone effect using Three.js
- **100% Browser-Based**: All AI processing happens in your browser

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- A modern web browser with webcam support
- Webcam access permission

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
npm run build
npm run preview
```

## 🎮 How to Use

1. **Allow Camera Access**: Grant webcam permission when prompted
2. **Show Your Hand**: Position your hand clearly in front of the camera
3. **Form Hand Signs**: Perform the sequence Tiger → Ram → Snake within 2-3 seconds
4. **Watch the Magic**: See the Shadow Clone Jutsu effect activate!

## 🏗️ Architecture

```
src/
├── camera/              # Webcam access & stream management
│   └── useCamera.ts
├── handTracking/        # MediaPipe hand landmark detection
│   └── useHandLandmarks.ts
├── classifier/          # Feature extraction & sign classification
│   ├── types.ts
│   ├── extractFeatures.ts
│   └── ruleClassifier.ts
├── jutsuEngine/         # Sequence detection & jutsu registry
│   ├── jutsuRegistry.ts
│   ├── sequenceDetector.ts
│   └── useJutsuEngine.ts
├── effects/             # 3D jutsu effects
│   └── ShadowClone.tsx
├── scene/               # Three.js scene setup
│   └── ThreeScene.tsx
├── store/               # Global state management (Zustand)
│   └── useAppStore.ts
└── App.tsx              # Main application component
```

## 🧠 How It Works

### 1. **Camera Layer**
- Requests webcam access via WebRTC
- Provides video stream to hand tracking

### 2. **Hand Tracking**
- MediaPipe Hands processes each video frame
- Extracts 21 3D landmark coordinates per hand
- Updates at ~30-60 FPS with throttling

### 3. **Feature Extraction**
- Converts raw landmarks into normalized features:
  - Finger extension states (0-1)
  - Finger bend angles
  - Fingertip distances
  - Palm orientation

### 4. **Rule-Based Classification**
- Applies threshold-based rules to identify signs
- Tiger: Index + middle extended, ring + pinky bent
- Ram: Index extended, others bent, fingers close
- Snake: Intertwined pattern detected

### 5. **Sequence Detection**
- Maintains rolling buffer of detected signs
- Ignores rapid duplicates (< 500ms)
- Resets if timeout exceeded (> 3s)
- Triggers jutsu when full sequence matches

### 6. **3D Effects**
- Renders video feed as Three.js texture
- Spawns clone meshes on jutsu activation
- Applies animations (floating, rotation, opacity)

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 + TypeScript | UI & component logic |
| Build Tool | Vite | Fast dev server & bundling |
| Hand Tracking | MediaPipe Hands (JS) | Browser-based AI hand detection |
| 3D Graphics | React Three Fiber + Three.js | WebGL rendering |
| State Management | Zustand | Lightweight global state |
| Video | WebRTC getUserMedia | Webcam access |

## 📊 Performance Optimizations

- **Throttled Updates**: State updates max 10x/second to prevent render thrashing
- **requestAnimationFrame**: Hand detection runs on animation loop
- **Memoization**: Heavy computations cached where possible
- **Pure Functions**: Feature extraction & classification are stateless
- **Lazy Loading**: MediaPipe models loaded via CDN on demand

## 🔮 Future Extensions (Post-MVP)

- [ ] Replace rule classifier with TensorFlow.js ML model
- [ ] Add training mode to collect custom sign data
- [ ] Implement more jutsus (Fireball, Rasengan, etc.)
- [ ] Add sound effects and visual polish
- [ ] Multiplayer mode with WebRTC
- [ ] Chakra meter and cooldown system
- [ ] Mobile/tablet support with touch controls

## 🎓 Educational Value

This project demonstrates:
- **Browser-based AI**: Client-side machine learning with MediaPipe
- **Computer Vision**: Landmark detection, feature engineering, classification
- **Real-time Processing**: Efficient frame-by-frame analysis
- **3D Graphics**: WebGL rendering with React Three Fiber
- **State Management**: Global state patterns with Zustand
- **Performance**: Optimizing React for high-frequency updates

## 📝 License

MIT License - Feel free to use this for learning and fun projects!

## 🤝 Contributing

Contributions welcome! This is a learning project, so feel free to:
- Improve hand sign detection accuracy
- Add new jutsus
- Enhance 3D effects
- Optimize performance
- Fix bugs

## 🙏 Acknowledgments

- MediaPipe team for the amazing hand tracking library
- Naruto/Masashi Kishimoto for the inspiration
- React Three Fiber community for 3D rendering tools

---

**Note**: This is a browser-based AI application. All processing happens locally in your browser - no data is sent to any server!
