import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Shadow Clone Jutsu Effect
 * Creates multiple offset clones of the video feed with reduced opacity
 */
export function ShadowClone({ videoElement }: { videoElement: HTMLVideoElement }) {
  const cloneRefs = useRef<THREE.Mesh[]>([]);
  const texturesRef = useRef<THREE.VideoTexture[]>([]);

  // Create video textures for each clone
  useEffect(() => {
    // Clean up old textures
    texturesRef.current.forEach(tex => tex.dispose());
    texturesRef.current = [];

    // Create new textures for clones
    const cloneOffsets = [
      { x: -2.5, opacity: 0.3 },
      { x: -1.3, opacity: 0.4 },
      { x: 1.3, opacity: 0.4 },
      { x: 2.5, opacity: 0.3 },
    ];

    cloneOffsets.forEach(() => {
      const texture = new THREE.VideoTexture(videoElement);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      texturesRef.current.push(texture);
    });

    return () => {
      texturesRef.current.forEach(tex => tex.dispose());
      texturesRef.current = [];
    };
  }, [videoElement]);

  // Animate clones
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Update textures
    texturesRef.current.forEach(tex => {
      tex.needsUpdate = true;
    });

    // Animate clone positions
    cloneRefs.current.forEach((clone, index) => {
      if (clone) {
        // Subtle floating animation
        clone.position.y = Math.sin(time * 2 + index * 0.5) * 0.1;
        
        // Slight rotation
        clone.rotation.z = Math.sin(time * 0.5 + index) * 0.03;
      }
    });
  });

  const aspectRatio = videoElement.videoWidth / videoElement.videoHeight || 16 / 9;
  const width = 4;
  const height = width / aspectRatio;

  const cloneOffsets = [
    { x: -2.5, opacity: 0.3, z: -0.3 },
    { x: -1.3, opacity: 0.4, z: -0.2 },
    { x: 1.3, opacity: 0.4, z: -0.2 },
    { x: 2.5, opacity: 0.3, z: -0.3 },
  ];

  return (
    <>
      {cloneOffsets.map((offset, index) => (
        <mesh
          key={index}
          position={[offset.x, 0, offset.z]}
          scale={[-1, 1, 1]}
          ref={(el) => {
            if (el) cloneRefs.current[index] = el;
          }}
        >
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            map={texturesRef.current[index] || null}
            transparent
            opacity={offset.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}
