"use client";

import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  src: string | null;
  webcamEnabled: boolean;
  autoPlay?: boolean;
}

export function VideoPlayer({ 
  src, 
  webcamEnabled,
  autoPlay = true 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Log webcam settings when they change
  useEffect(() => {
    console.log(`Webcam settings - enabled: ${webcamEnabled}`);
  }, [webcamEnabled]);

  useEffect(() => {
    if (videoRef.current && src) {
      videoRef.current.src = src;
      if (autoPlay) {
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
        });
      }
    }
  }, [src, autoPlay]);
  
  if (!src) return null;
  
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-video">
      <video 
        ref={videoRef}
        controls
        className="w-full h-full"
      />
    </div>
  );
} 