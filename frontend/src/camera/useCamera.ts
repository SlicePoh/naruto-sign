import { useEffect, useRef, useState } from 'react';

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  error: string | null;
  isReady: boolean;
}

/**
 * Custom hook to manage webcam access
 * Handles stream initialization, cleanup, and error states
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      try {
        // Request webcam access with preferred settings
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = mediaStream;
        setStream(mediaStream);

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            if (mounted && videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  if (mounted) {
                    setIsReady(true);
                  }
                })
                .catch(err => {
                  console.error('Error playing video:', err);
                  setError('Failed to start video playback');
                });
            }
          };
        }
      } catch (err) {
        if (mounted) {
          console.error('Error accessing webcam:', err);
          setError(err instanceof Error ? err.message : 'Failed to access webcam');
        }
      }
    }

    initCamera();

    // Cleanup function
    return () => {
      mounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      setIsReady(false);
    };
  }, []);

  return { videoRef, stream, error, isReady };
}
