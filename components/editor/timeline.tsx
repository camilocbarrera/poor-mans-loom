"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { EditorState, TimelineSegment } from "@/lib/types";
import { formatTime } from "@/lib/editor/timeline";
import { Scissors, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineProps {
  editorState: EditorState;
  onTrimStart: (time: number) => void;
  onTrimEnd: (time: number) => void;
  onSplit: (segmentId: string, time: number) => void;
  onDeleteSegment: (segmentId: string) => void;
  onRestoreSegment: (segmentId: string) => void;
  onSeek: (time: number) => void;
  currentTime: number;
}

export function Timeline({
  editorState,
  onTrimStart,
  onTrimEnd,
  onSplit,
  onDeleteSegment,
  onRestoreSegment,
  onSeek,
  currentTime,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!timelineRef.current) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    return percentage * editorState.duration;
  }, [editorState.duration]);

  const getPositionFromTime = useCallback((time: number): number => {
    return (time / editorState.duration) * 100;
  }, [editorState.duration]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'playhead') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    
    const time = getTimeFromPosition(e.clientX);
    
    if (splitMode) {
      const segment = editorState.segments.find(
        s => !s.deleted && time >= s.startTime && time <= s.endTime
      );
      if (segment) {
        onSplit(segment.id, time);
        setSplitMode(false);
      }
    } else {
      onSeek(time);
    }
  }, [isDragging, getTimeFromPosition, splitMode, editorState.segments, onSplit, onSeek]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      
      if (isDragging === 'start') {
        onTrimStart(time);
      } else if (isDragging === 'end') {
        onTrimEnd(time);
      } else if (isDragging === 'playhead') {
        onSeek(time);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, getTimeFromPosition, onTrimStart, onTrimEnd, onSeek]);

  const firstActiveSegment = editorState.segments.find(s => !s.deleted);
  const lastActiveSegment = [...editorState.segments].reverse().find(s => !s.deleted);

  return (
    <div className="w-full space-y-3">
      {/* Timeline tools */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={splitMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSplitMode(!splitMode)}
            title="Split tool - click on timeline to split"
          >
            <Scissors className="w-4 h-4 mr-1" />
            Split
          </Button>
        </div>
        
        <div className="text-xs font-mono text-neutral-400">
          {formatTime(currentTime)} / {formatTime(editorState.duration)}
        </div>
      </div>

      {/* Timeline track */}
      <div
        ref={timelineRef}
        className={`relative h-16 bg-neutral-900 rounded-lg overflow-hidden noise-texture noise-texture-subtle ${
          splitMode ? 'cursor-crosshair' : 'cursor-pointer'
        }`}
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 right-0 h-4 flex items-center border-b border-neutral-800">
          {Array.from({ length: 11 }).map((_, i) => {
            const time = (editorState.duration / 10) * i;
            return (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: `${i * 10}%` }}
              >
                <div className="w-px h-2 bg-neutral-700" />
                <span className="text-[9px] text-neutral-500 mt-0.5">
                  {formatTime(time)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Segments */}
        <div className="absolute top-5 left-0 right-0 bottom-0">
          {editorState.segments.map((segment) => (
            <div
              key={segment.id}
              className={`absolute top-1 bottom-1 rounded transition-all ${
                segment.deleted
                  ? 'bg-neutral-800/50 border border-dashed border-neutral-700'
                  : 'bg-blue-600/80 border border-blue-500'
              }`}
              style={{
                left: `${getPositionFromTime(segment.startTime)}%`,
                width: `${getPositionFromTime(segment.endTime - segment.startTime)}%`,
              }}
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* Segment controls on hover */}
              {hoveredSegment === segment.id && !splitMode && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-neutral-800 rounded px-1 py-0.5 shadow-lg z-10">
                  {segment.deleted ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreSegment(segment.id);
                      }}
                      className="p-1 hover:bg-neutral-700 rounded"
                      title="Restore segment"
                    >
                      <RotateCcw className="w-3 h-3 text-green-400" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSegment(segment.id);
                      }}
                      className="p-1 hover:bg-neutral-700 rounded"
                      title="Delete segment"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Trim handles */}
        {firstActiveSegment && (
          <div
            className="absolute top-5 bottom-0 w-2 bg-yellow-500 cursor-ew-resize z-20 hover:bg-yellow-400 rounded-l"
            style={{ left: `${getPositionFromTime(firstActiveSegment.startTime)}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-300 rounded" />
          </div>
        )}
        
        {lastActiveSegment && (
          <div
            className="absolute top-5 bottom-0 w-2 bg-yellow-500 cursor-ew-resize z-20 hover:bg-yellow-400 rounded-r"
            style={{ left: `calc(${getPositionFromTime(lastActiveSegment.endTime)}% - 8px)` }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-300 rounded" />
          </div>
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-30 cursor-ew-resize"
          style={{ left: `${getPositionFromTime(currentTime)}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'playhead')}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
        </div>
      </div>

      {/* Segment list */}
      <div className="flex flex-wrap gap-2">
        {editorState.segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`text-xs px-2 py-1 rounded ${
              segment.deleted
                ? 'bg-neutral-800 text-neutral-500 line-through'
                : 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
            }`}
          >
            Segment {index + 1}: {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
          </div>
        ))}
      </div>
    </div>
  );
}

