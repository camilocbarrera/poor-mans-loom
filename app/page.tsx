"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScreenRecorder } from "@/components/recorder/screen-recorder";
import { VideoEditor } from "@/components/editor/video-editor";
import { GithubBadge } from "@/components/github-badge";
import { Logo } from "@/components/logo";
import { Heart, Video, Scissors } from "lucide-react";

type AppState = 'recording' | 'editing';

interface RecordingData {
  blob: Blob;
  duration: number;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('recording');
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);

  const handleRecordingComplete = useCallback((blob: Blob, duration: number) => {
    setRecordingData({ blob, duration });
    setAppState('editing');
  }, []);

  const handleBackToRecording = useCallback(() => {
    if (recordingData?.blob) {
      URL.revokeObjectURL(URL.createObjectURL(recordingData.blob));
    }
    setRecordingData(null);
    setAppState('recording');
  }, [recordingData]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-800/50 bg-[#0a0a0a]/80 backdrop-blur-sm noise-texture noise-texture-subtle">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="text-neutral-400" />
            <span className="text-xs font-mono tracking-wide text-neutral-400">
              ScreenClip
            </span>
          </div>
          
          <GithubBadge />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-sm tracking-wide uppercase flex items-center gap-2">
                    {appState === 'recording' ? (
                      <>
                        <Video className="w-4 h-4" />
                        Record
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        Edit
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {appState === 'recording' 
                      ? 'Capture screen, camera, and audio — all locally'
                      : 'Trim, split, and export your recording'
                    }
                  </CardDescription>
                </div>
                
                {/* State indicator */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${appState === 'recording' ? 'bg-blue-500' : 'bg-neutral-600'}`} />
                  <div className={`w-2 h-2 rounded-full ${appState === 'editing' ? 'bg-blue-500' : 'bg-neutral-600'}`} />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {appState === 'recording' ? (
                <ScreenRecorder onRecordingComplete={handleRecordingComplete} />
              ) : recordingData ? (
                <VideoEditor
                  videoBlob={recordingData.blob}
                  videoDuration={recordingData.duration}
                  onBack={handleBackToRecording}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="w-full border-t border-neutral-800/50 noise-texture noise-texture-subtle">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-600">
            Record · Edit · Export — All in your browser
          </span>
          <span className="text-[10px] font-mono text-neutral-600 flex items-center gap-1">
            made with <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> by{' '}
            <a 
              href="https://cris.fast" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              cris
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
