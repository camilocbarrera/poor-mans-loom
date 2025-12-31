"use client";

import { useState, useCallback, useEffect } from "react";
import { EditorState, ExportOptions, ExportProgress } from "@/lib/types";
import { 
  createInitialEditorState, 
  trimStart, 
  trimEnd, 
  splitSegment, 
  deleteSegment, 
  restoreSegment,
  getTotalActiveDuration,
  getActiveSegments 
} from "@/lib/editor/timeline";
import { exportVideo, downloadBlob, getExportFilename } from "@/lib/editor/operations";
import { VideoPlayer } from "@/components/player/video-player";
import { Timeline } from "./timeline";
import { ExportDialog } from "./export-dialog";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface VideoEditorProps {
  videoBlob: Blob;
  videoDuration: number;
  onBack: () => void;
}

export function VideoEditor({ videoBlob, videoDuration, onBack }: VideoEditorProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [editorState, setEditorState] = useState<EditorState>(() => 
    createInitialEditorState(videoDuration)
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // Calculate these early so they can be used in callbacks
  const activeDuration = getTotalActiveDuration(editorState);
  const hasEdits = activeDuration !== videoDuration || editorState.segments.some(s => s.deleted);

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  const handleTrimStart = useCallback((time: number) => {
    setEditorState(prev => trimStart(prev, time));
  }, []);

  const handleTrimEnd = useCallback((time: number) => {
    setEditorState(prev => trimEnd(prev, time));
  }, []);

  const handleSplit = useCallback((segmentId: string, time: number) => {
    setEditorState(prev => splitSegment(prev, segmentId, time));
    toast.success("Segment split");
  }, []);

  const handleDeleteSegment = useCallback((segmentId: string) => {
    const activeSegments = getActiveSegments(editorState);
    if (activeSegments.length <= 1) {
      toast.error("Cannot delete the last segment");
      return;
    }
    setEditorState(prev => deleteSegment(prev, segmentId));
    toast.success("Segment deleted");
  }, [editorState]);

  const handleRestoreSegment = useCallback((segmentId: string) => {
    setEditorState(prev => restoreSegment(prev, segmentId));
    toast.success("Segment restored");
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayPause = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleReset = useCallback(() => {
    setEditorState(createInitialEditorState(videoDuration));
    setCurrentTime(0);
    setIsPlaying(false);
    toast.info("Timeline reset");
  }, [videoDuration]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    setIsExporting(true);
    setExportProgress(null);

    // If no edits and WebM format, just download the original
    if (!hasEdits && options.format === 'webm') {
      const filename = getExportFilename('webm');
      downloadBlob(videoBlob, filename);
      setExportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Download complete!',
      });
      toast.success(`Downloaded ${filename}`);
      setIsExporting(false);
      return;
    }

    try {
      const outputBlob = await exportVideo(
        videoBlob,
        editorState,
        options,
        setExportProgress
      );

      const filename = getExportFilename(options.format);
      downloadBlob(outputBlob, filename);
      toast.success(`Video exported as ${filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed. Please try again.';
      setExportProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage,
      });
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [videoBlob, editorState, hasEdits]);

  const handleQuickDownload = useCallback(() => {
    const filename = getExportFilename('webm');
    downloadBlob(videoBlob, filename);
    toast.success(`Downloaded ${filename}`);
  }, [videoBlob]);

  return (
    <div className="w-full space-y-4">
      {/* Video player */}
      <div className="w-full rounded-lg overflow-hidden border border-neutral-800 noise-texture noise-texture-subtle">
        <VideoPlayer
          src={videoUrl}
          currentTime={currentTime}
          onTimeUpdate={handleTimeUpdate}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
        />
      </div>

      {/* Timeline */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 noise-texture noise-texture-subtle">
        <Timeline
          editorState={editorState}
          onTrimStart={handleTrimStart}
          onTrimEnd={handleTrimEnd}
          onSplit={handleSplit}
          onDeleteSegment={handleDeleteSegment}
          onRestoreSegment={handleRestoreSegment}
          onSeek={handleSeek}
          currentTime={currentTime}
        />
      </div>

      {/* Editor info */}
      <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
        <span>
          Original: {videoDuration.toFixed(1)}s → Edited: {activeDuration.toFixed(1)}s
        </span>
        {hasEdits && (
          <span className="text-yellow-500">
            Unsaved changes
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasEdits}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!hasEdits && (
            <Button variant="outline" onClick={handleQuickDownload}>
              <Download className="w-4 h-4 mr-2" />
              Quick Download
            </Button>
          )}
          <Button onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export{hasEdits ? ' Edited' : ''}
          </Button>
        </div>
      </div>

      {/* Export dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        progress={exportProgress}
        isExporting={isExporting}
      />
    </div>
  );
}

