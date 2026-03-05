import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ThreeSceneProps {
  videoElement: HTMLVideoElement | null;
}

/**
 * Main 3D scene component
 * Renders video background (jutsu effects are rendered as DOM overlays)
 */
export function ThreeScene({ videoElement }: ThreeSceneProps) {
  if (!videoElement) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#000'
      }}>
        <p style={{ color: '#fff' }}>Initializing camera...</p>
      </div>
    );
  }

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ outputColorSpace: THREE.SRGBColorSpace }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={1} />
      {/* Main video background plane */}
      <VideoPlane videoElement={videoElement} />
    </Canvas>
  );
}

/**
 * Video background plane component
 */
function VideoPlane({ videoElement }: { videoElement: HTMLVideoElement }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  useEffect(() => {
    // Create video texture
    const texture = new THREE.VideoTexture(videoElement);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    // Prevent double-gamma: the renderer applies sRGB output encoding,
    // so keep the video texture in linear space to avoid a washed-out / overly-bright feed.
    texture.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = texture;

    // Apply to material
    if (materialRef.current) {
      materialRef.current.map = texture;
      materialRef.current.needsUpdate = true;
    }

    return () => {
      texture.dispose();
    };
  }, [videoElement]);

  // Update texture each frame
  useFrame(() => {
    if (textureRef.current && materialRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  // Calculate proper aspect ratio
  const aspectRatio = videoElement.videoWidth / videoElement.videoHeight || 16 / 9;
  const width = 4;
  const height = width / aspectRatio;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[-1, 1, 1]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial ref={materialRef} side={THREE.DoubleSide} />
    </mesh>
  );
}
