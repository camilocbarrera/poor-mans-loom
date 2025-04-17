"use client";

import { Button } from "@/components/ui/button";
import { 
  Circle, 
  Square, 
  Video, 
  Mic, 
  VideoOff, 
  MicOff, 
  Download,
  Share2
} from "lucide-react";

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  webcamEnabled: boolean;
  microphoneEnabled: boolean;
  recordedVideoUrl: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onToggleWebcam: () => void;
  onToggleMicrophone: () => void;
  onDownloadVideo: () => void;
  onShareVideo: () => void;
  onStartNewRecording?: () => void;
}

export function RecordingControls({
  isRecording,
  isPaused,
  webcamEnabled,
  microphoneEnabled,
  recordedVideoUrl,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onToggleWebcam,
  onToggleMicrophone,
  onDownloadVideo,
  onShareVideo,
  onStartNewRecording
}: RecordingControlsProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Button
            variant={webcamEnabled ? "default" : "outline"}
            size="icon"
            onClick={onToggleWebcam}
            className="rounded-full"
            title={webcamEnabled ? "Disable webcam overlay" : "Enable webcam overlay"}
          >
            {webcamEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            variant={microphoneEnabled ? "default" : "outline"}
            size="icon"
            onClick={onToggleMicrophone}
            className="rounded-full"
            title={microphoneEnabled ? "Disable microphone" : "Enable microphone"}
          >
            {microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <Button
                variant="destructive"
                onClick={onStopRecording}
                className="rounded-full"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              {isPaused ? (
                <Button
                  variant="outline"
                  onClick={onResumeRecording}
                  className="rounded-full"
                >
                  Resume
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onPauseRecording}
                  className="rounded-full"
                >
                  Pause
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="default"
              onClick={recordedVideoUrl ? onStartNewRecording : onStartRecording}
              className="rounded-full"
            >
              <Circle className="h-4 w-4 mr-2 fill-current" />
              {recordedVideoUrl ? "Record Again" : "Record"}
            </Button>
          )}
        </div>
      </div>
      
      {recordedVideoUrl && (
        <div className="flex items-center justify-between w-full mt-4">
          <Button
            variant="outline"
            onClick={onDownloadVideo}
            className="rounded-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={onShareVideo}
            className="rounded-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      )}
    </div>
  );
} 