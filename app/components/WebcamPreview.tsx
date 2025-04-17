"use client";

import { useRef, useEffect, useState, RefObject } from "react";
import Webcam from "react-webcam";
import { toast } from "sonner";
import { Move } from "lucide-react";

interface WebcamPreviewProps {
  enabled: boolean;
  onWebcamReady?: (stream: MediaStream) => void;
  onPositionChange?: (relativePosition: { x: number; y: number }) => void;
  screenContainerRef: RefObject<HTMLDivElement | null>;
}

export function WebcamPreview({ enabled, onWebcamReady, onPositionChange, screenContainerRef }: WebcamPreviewProps) {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebcamPermission, setHasWebcamPermission] = useState<boolean | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  
  // Initialize webcam when enabled
  useEffect(() => {
    let currentWebcamRef: Webcam | null = null;
    
    if (enabled) {
      // Store ref in local variable
      currentWebcamRef = webcamRef.current;
      
      // Attempt to get webcam access as soon as component is enabled
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          setHasWebcamPermission(true);
          if (currentWebcamRef) {
            onWebcamReady?.(stream);
          }
        })
        .catch(error => {
          console.error("Webcam access error:", error);
          setHasWebcamPermission(false);
          toast.error("Could not access webcam. Please check permissions.");
        });
      
      // Cleanup function
      return () => {
        if (currentWebcamRef && currentWebcamRef.stream) {
          const tracks = currentWebcamRef.stream.getTracks();
          tracks.forEach(track => track.stop());
        }
      };
    }
  }, [enabled, onWebcamReady]);
  
  // When stream is available in the Webcam component
  const handleUserMedia = (stream: MediaStream) => {
    onWebcamReady?.(stream);
  };
  
  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionRef.current = { ...position };
  };
  
  // Handle touch start for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      positionRef.current = { ...position };
    }
  };
  
  // Update draggging position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      const newPos = {
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy
      };
      setPosition(newPos);

      // Calculate position relative to screen container
      const previewRect = containerRef.current?.getBoundingClientRect();
      const screenRect = screenContainerRef.current?.getBoundingClientRect();
      if (previewRect && screenRect) {
        const relativeX = previewRect.left - screenRect.left;
        const relativeY = previewRect.top - screenRect.top;
        onPositionChange?.({ x: relativeX, y: relativeY });
      } else {
        // Fallback or error handling if refs aren't ready
        onPositionChange?.({ x: 0, y: 0 });
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      
      const newPos = {
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy
      };
      setPosition(newPos);

      // Calculate position relative to screen container
      const previewRect = containerRef.current?.getBoundingClientRect();
      const screenRect = screenContainerRef.current?.getBoundingClientRect();
      if (previewRect && screenRect) {
        const relativeX = previewRect.left - screenRect.left;
        const relativeY = previewRect.top - screenRect.top;
        onPositionChange?.({ x: relativeX, y: relativeY });
      } else {
        // Fallback or error handling if refs aren't ready
        onPositionChange?.({ x: 0, y: 0 });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, onPositionChange, screenContainerRef]);
  
  if (!enabled) return null;
  
  return (
    <div 
      ref={containerRef}
      className={`absolute rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        width: '12rem', 
        height: '9rem',
        bottom: position.y === 0 ? '1rem' : 'auto',
        right: position.x === 0 ? '1rem' : 'auto',
        transform: position.x !== 0 || position.y !== 0 ? `translate(${position.x}px, ${position.y}px)` : undefined,
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
        boxShadow: isDragging ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : undefined,
        zIndex: 50
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {hasWebcamPermission === false ? (
        <div className="w-full h-full bg-red-500/10 flex items-center justify-center text-xs text-red-500 p-2 text-center">
          Camera access denied. Check browser permissions.
        </div>
      ) : (
        <>
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored
            onUserMedia={handleUserMedia}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-black/50 rounded-full p-1">
            <Move className="h-4 w-4 text-white" />
          </div>
        </>
      )}
    </div>
  );
} 