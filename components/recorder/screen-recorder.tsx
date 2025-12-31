"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CameraSettings, AudioSettings, RecordingState } from "@/lib/types";
import { startScreenCapture, stopScreenCapture } from "@/lib/recorder/screen";
import { getMicrophoneStream, createAudioMixer, stopAudioStream, isMicError } from "@/lib/recorder/audio";
import { getCameraStream, isCameraError } from "@/lib/recorder/camera";
import { createCompositor, createMediaRecorder, createVideoBlob } from "@/lib/recorder/compositor";
import { CameraOverlay } from "./camera-overlay";
import { AudioControls } from "./audio-controls";
import { RecordingControls } from "./recording-controls";

interface ScreenRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
}

const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  position: 'bottom-right',
  size: 'medium',
  shape: 'rectangle',
};

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  microphoneEnabled: true,
  systemAudioEnabled: true,
};

export function ScreenRecorder({ onRecordingComplete }: ScreenRecorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    startTime: null,
  });
  
  // Settings
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(DEFAULT_CAMERA_SETTINGS);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  // Streams
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [systemAudioStream, setSystemAudioStream] = useState<MediaStream | null>(null);
  
  // Refs for cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<Awaited<ReturnType<typeof createCompositor>> | null>(null);
  const audioMixerRef = useRef<ReturnType<typeof createAudioMixer> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera stream
  useEffect(() => {
    if (cameraEnabled && !cameraStream) {
      getCameraStream().then(result => {
        if (isCameraError(result)) {
          toast.error(result.message);
          setCameraEnabled(false);
        } else {
          setCameraStream(result.stream);
        }
      });
    } else if (!cameraEnabled && cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraEnabled, cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    compositorRef.current?.cleanup();
    compositorRef.current = null;
    
    audioMixerRef.current?.cleanup();
    audioMixerRef.current = null;
    
    stopScreenCapture(screenStreamRef.current);
    screenStreamRef.current = null;
    
    stopAudioStream(micStream);
    setMicStream(null);
    
    setSystemAudioStream(null);
  }, [micStream]);

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      
      // Get screen capture with system audio
      const screenResult = await startScreenCapture(audioSettings.systemAudioEnabled);
      if (!screenResult) {
        toast.error("Screen capture was cancelled or denied");
        return;
      }
      
      screenStreamRef.current = screenResult.stream;
      
      // Extract system audio if available
      let systemAudio: MediaStream | null = null;
      if (screenResult.hasSystemAudio && audioSettings.systemAudioEnabled) {
        systemAudio = new MediaStream(screenResult.stream.getAudioTracks());
        setSystemAudioStream(systemAudio);
      }
      
      // Get microphone if enabled
      let mic: MediaStream | null = null;
      if (audioSettings.microphoneEnabled) {
        const micResult = await getMicrophoneStream(audioSettings.microphoneDeviceId);
        if (isMicError(micResult)) {
          toast.warning(micResult.message + " Recording without microphone.");
        } else {
          mic = micResult;
          setMicStream(mic);
        }
      }
      
      // Create audio mixer
      const audioMixer = createAudioMixer(mic, systemAudio);
      audioMixerRef.current = audioMixer;
      
      // Create compositor for video (async - waits for videos to be ready)
      let compositor;
      try {
        compositor = await createCompositor({
          screenStream: screenResult.stream,
          cameraStream: cameraEnabled ? cameraStream : null,
          cameraSettings,
        });
        compositorRef.current = compositor;
      } catch (compositorError) {
        console.error("Compositor initialization failed:", compositorError);
        toast.error("Failed to initialize video compositor");
        cleanup();
        return;
      }
      
      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...compositor.canvasStream.getVideoTracks(),
        ...audioMixer.mixedStream.getAudioTracks(),
      ]);
      
      // Create and start media recorder
      const recorder = createMediaRecorder(combinedStream);
      mediaRecorderRef.current = recorder;
      
      // Store start time in a ref to access in onstop
      const startTime = Date.now();
      const startTimeRef = { current: startTime };
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const blob = createVideoBlob(chunksRef.current);
        cleanup();
        setRecordingState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          startTime: null,
        });
        onRecordingComplete(blob, duration);
        toast.success("Recording completed!");
      };
      
      // Handle screen share stop
      screenResult.stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
          stopRecording();
        }
      };
      
      recorder.start(100);
      
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        startTime,
      });
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.isPaused ? prev.duration : Math.floor((Date.now() - startTime) / 1000),
        }));
      }, 1000);
      
      toast.success("Recording started!");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start recording");
      cleanup();
    }
  }, [audioSettings, cameraEnabled, cameraStream, cameraSettings, cleanup, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState(prev => ({ ...prev, isPaused: true }));
      toast.info("Recording paused");
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState(prev => ({ ...prev, isPaused: false }));
      toast.info("Recording resumed");
    }
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled(prev => !prev);
  }, []);

  const handleCameraSettingsChange = useCallback((settings: Partial<CameraSettings>) => {
    setCameraSettings(prev => ({ ...prev, ...settings }));
    compositorRef.current?.updateCameraSettings(settings);
  }, []);

  const handleAudioSettingsChange = useCallback((settings: Partial<AudioSettings>) => {
    setAudioSettings(prev => ({ ...prev, ...settings }));
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Preview area */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center noise-texture noise-texture-subtle"
      >
        {recordingState.isRecording ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${recordingState.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-neutral-300 font-mono text-lg">
                Recording{recordingState.isPaused ? " — Paused" : ""}
              </span>
            </div>
            <p className="text-neutral-500 font-mono text-xs">
              Your screen is being captured
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-neutral-500 font-mono text-sm">
              Click Record to start capturing
            </p>
            <p className="text-neutral-600 font-mono text-xs mt-1">
              Screen + {audioSettings.microphoneEnabled ? 'Mic' : ''} {audioSettings.systemAudioEnabled ? '+ System Audio' : ''}
            </p>
          </div>
        )}

        {/* Camera overlay */}
        {cameraEnabled && cameraStream && (
          <CameraOverlay
            stream={cameraStream}
            settings={cameraSettings}
            onSettingsChange={handleCameraSettingsChange}
            containerRef={containerRef}
            isRecording={recordingState.isRecording}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* Audio controls */}
        <div className="flex items-center justify-between">
          <AudioControls
            settings={audioSettings}
            onSettingsChange={handleAudioSettingsChange}
            micStream={micStream}
            systemStream={systemAudioStream}
            disabled={recordingState.isRecording}
          />
        </div>

        {/* Recording controls */}
        <RecordingControls
          recordingState={recordingState}
          cameraEnabled={cameraEnabled}
          hasRecording={false}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onPauseRecording={pauseRecording}
          onResumeRecording={resumeRecording}
          onToggleCamera={toggleCamera}
          onNewRecording={() => {}}
        />
      </div>
    </div>
  );
}
