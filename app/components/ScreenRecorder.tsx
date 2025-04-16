"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RecordingControls } from "./RecordingControls";
import { WebcamPreview } from "./WebcamPreview";
import { VideoPlayer } from "./VideoPlayer";
import { 
  startScreenCapture, 
  startAudioCapture,
  createRecorder,
  createVideoURL,
  downloadVideo
} from "../utils/screen-capture";
// Import types
import "../utils/types";

export function ScreenRecorder() {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [webcamPosition, setWebcamPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Set records length for debugging
  useEffect(() => {
    if (recordedChunks.length > 0) {
      console.log(`Recorded chunks: ${recordedChunks.length}`);
    }
  }, [recordedChunks]);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  
  // Cleanup function
  const cleanupStreams = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => track.stop());
      combinedStreamRef.current = null;
    }
  }, []);
  
  // Handle webcam stream
  const handleWebcamReady = useCallback((stream: MediaStream) => {
    webcamStreamRef.current = stream;
  }, []);
  
  // Start recording
  const handleStartRecording = useCallback(async () => {
    try {
      // Request screen capture
      const screenStream = await startScreenCapture();
      if (!screenStream) {
        toast.error("Failed to access screen capture");
        return;
      }
      screenStreamRef.current = screenStream;
      
      // Request audio capture if needed
      if (microphoneEnabled) {
        const audioStream = await startAudioCapture(microphoneEnabled);
        if (audioStream) {
          micStreamRef.current = audioStream;
        }
      }
      
      // Create canvas for compositing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Polyfill roundRect for browsers that don't support it
      if (ctx && !ctx.roundRect) {
        ctx.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
          if (width < 2 * radius) radius = width / 2;
          if (height < 2 * radius) radius = height / 2;
          this.beginPath();
          this.moveTo(x + radius, y);
          this.arcTo(x + width, y, x + width, y + height, radius);
          this.arcTo(x + width, y + height, x, y + height, radius);
          this.arcTo(x, y + height, x, y, radius);
          this.arcTo(x, y, x + width, y, radius);
          this.closePath();
          return this;
        };
      }
      
      const screenVideo = document.createElement('video');
      
      // Set canvas dimensions to match screen video dimensions
      const videoTrack = screenStream.getVideoTracks()[0];
      const { width, height } = videoTrack.getSettings();
      canvas.width = width || 1920;
      canvas.height = height || 1080;
      
      // Set up screen video source
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.play();
      
      // Set up webcam video if enabled
      let webcamVideo: HTMLVideoElement | null = null;
      if (webcamEnabled && webcamStreamRef.current) {
        webcamVideo = document.createElement('video');
        webcamVideo.srcObject = webcamStreamRef.current;
        webcamVideo.muted = true;
        webcamVideo.play();
      }
      
      // Create animation frame to draw on canvas
      const drawVideoFrame = () => {
        if (!ctx) return;
        
        // Draw screen capture
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        
        // Draw webcam overlay if enabled
        if (webcamEnabled && webcamVideo && webcamVideo.readyState >= 2) {
          const webcamWidth = canvas.width * 0.25; // 25% of screen width
          const webcamHeight = (webcamVideo.videoHeight / webcamVideo.videoWidth) * webcamWidth;
          
          // Position based on selected position
          let x = 0;
          let y = 0;
          
          switch(webcamPosition) {
            case "top-left":
              x = 16;
              y = 16;
              break;
            case "top-right":
              x = canvas.width - webcamWidth - 16;
              y = 16;
              break;
            case "bottom-left":
              x = 16;
              y = canvas.height - webcamHeight - 16;
              break;
            case "bottom-right":
            default:
              x = canvas.width - webcamWidth - 16;
              y = canvas.height - webcamHeight - 16;
              break;
          }
          
          // Draw webcam with rounded corners
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, webcamWidth, webcamHeight, 8);
          ctx.clip();
          ctx.drawImage(webcamVideo, x, y, webcamWidth, webcamHeight);
          
          // Add border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
        
        // Continue animation loop
        requestAnimationFrame(drawVideoFrame);
      };
      
      // Start drawing
      drawVideoFrame();
      
      // Get a stream from the canvas
      const canvasStream = canvas.captureStream();
      
      // Add audio tracks to the canvas stream
      const audioTracks: MediaStreamTrack[] = [];
      if (micStreamRef.current) {
        audioTracks.push(...micStreamRef.current.getAudioTracks());
      }
      
      audioTracks.forEach(track => {
        canvasStream.addTrack(track);
      });
      
      // Use the composited stream
      combinedStreamRef.current = canvasStream;
      
      // Create a media recorder
      const mediaRecorder = createRecorder(canvasStream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Setup recorder event handlers
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
        const videoUrl = createVideoURL(chunks);
        setRecordedVideoUrl(videoUrl);
        setIsRecording(false);
        cleanupStreams();
        toast.success("Recording completed!");
      };
      
      // Start recording
      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordedChunks([]);
      setRecordedVideoUrl(null);
      toast.success("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start recording");
      cleanupStreams();
    }
  }, [microphoneEnabled, webcamEnabled, webcamPosition, cleanupStreams]);
  
  // Stop recording
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);
  
  // Pause recording
  const handlePauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info("Recording paused");
    }
  }, [isRecording, isPaused]);
  
  // Resume recording
  const handleResumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.info("Recording resumed");
    }
  }, [isRecording, isPaused]);
  
  // Toggle webcam
  const handleToggleWebcam = useCallback(() => {
    if (!webcamEnabled) {
      setWebcamEnabled(true);
    } else {
      // If webcam is currently enabled, disable it and stop any existing webcam stream
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
      setWebcamEnabled(false);
    }
  }, [webcamEnabled]);
  
  // Toggle microphone
  const handleToggleMicrophone = useCallback(() => {
    setMicrophoneEnabled(prev => !prev);
  }, []);
  
  // Download video
  const handleDownloadVideo = useCallback(() => {
    if (recordedVideoUrl) {
      downloadVideo(recordedVideoUrl, "screenclip-recording.webm");
      toast.success("Download started");
    }
  }, [recordedVideoUrl]);
  
  // Share video
  const handleShareVideo = useCallback(() => {
    toast.info("Share feature coming soon!");
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStreams();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [cleanupStreams, recordedVideoUrl]);
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ScreenClip</CardTitle>
          <CardDescription>Simple screen recording - one click to capture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative w-full rounded-lg overflow-hidden bg-zinc-950 aspect-video flex items-center justify-center border border-zinc-800">
            {recordedVideoUrl ? (
              <VideoPlayer 
                src={recordedVideoUrl} 
                webcamEnabled={webcamEnabled}
                webcamPosition={webcamPosition}
              />
            ) : (
              <div className="text-center p-8">
                {isRecording ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-zinc-200">Recording your screen{isPaused ? " (Paused)" : ""}</span>
                  </div>
                ) : (
                  <p className="text-zinc-400">Click Record to start capturing your screen</p>
                )}
              </div>
            )}
            
            {/* Webcam preview */}
            {webcamEnabled && (
              <WebcamPreview enabled={webcamEnabled} onWebcamReady={handleWebcamReady} />
            )}
          </div>
          
          {/* Recording controls */}
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            webcamEnabled={webcamEnabled}
            microphoneEnabled={microphoneEnabled}
            recordedVideoUrl={recordedVideoUrl}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
            onToggleWebcam={handleToggleWebcam}
            onToggleMicrophone={handleToggleMicrophone}
            onDownloadVideo={handleDownloadVideo}
            onShareVideo={handleShareVideo}
          />
          
          {/* Webcam position control - only show when webcam is enabled */}
          {webcamEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Webcam Position</span>
                <span className="text-xs text-slate-500">Drag preview to reposition</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 