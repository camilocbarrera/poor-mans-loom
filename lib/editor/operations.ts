import { FFmpeg } from '@ffmpeg/ffmpeg';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg, deleteFileFromFFmpeg } from './ffmpeg';
import { getActiveSegments } from './timeline';
import { EditorState, ExportOptions, ExportProgress } from '../types';

export async function exportVideo(
  videoBlob: Blob,
  editorState: EditorState,
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg(onProgress);
  
  onProgress({
    stage: 'preparing',
    progress: 10,
    message: 'Preparing video...',
  });
  
  await writeFileToFFmpeg(ffmpeg, 'input.webm', videoBlob);
  
  const activeSegments = getActiveSegments(editorState);
  
  if (activeSegments.length === 0) {
    throw new Error('No segments to export');
  }
  
  onProgress({
    stage: 'processing',
    progress: 20,
    message: 'Processing segments...',
  });
  
  let outputFilename: string;
  
  if (activeSegments.length === 1) {
    outputFilename = await processSingleSegment(
      ffmpeg,
      activeSegments[0],
      options,
      onProgress
    );
  } else {
    outputFilename = await processMultipleSegments(
      ffmpeg,
      activeSegments,
      options,
      onProgress
    );
  }
  
  onProgress({
    stage: 'encoding',
    progress: 90,
    message: 'Finalizing video...',
  });
  
  const outputData = await readFileFromFFmpeg(ffmpeg, outputFilename);
  
  // Cleanup
  await deleteFileFromFFmpeg(ffmpeg, 'input.webm');
  await deleteFileFromFFmpeg(ffmpeg, outputFilename);
  
  const mimeType = options.format === 'mp4' ? 'video/mp4' : 'video/webm';
  const outputBlob = new Blob([new Uint8Array(outputData).buffer as ArrayBuffer], { type: mimeType });
  
  onProgress({
    stage: 'complete',
    progress: 100,
    message: 'Export complete!',
  });
  
  return outputBlob;
}

async function processSingleSegment(
  ffmpeg: FFmpeg,
  segment: { startTime: number; endTime: number },
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void
): Promise<string> {
  const outputFilename = options.format === 'mp4' ? 'output.mp4' : 'output.webm';
  
  const args = ['-i', 'input.webm'];
  
  args.push('-ss', segment.startTime.toFixed(3));
  args.push('-to', segment.endTime.toFixed(3));
  
  if (options.format === 'mp4') {
    args.push('-c:v', 'libx264');
    args.push('-preset', getPresetForQuality(options.quality));
    args.push('-crf', getCRFForQuality(options.quality));
    args.push('-c:a', 'aac');
    args.push('-b:a', '128k');
    args.push('-movflags', '+faststart');
  } else {
    args.push('-c:v', 'libvpx-vp9');
    args.push('-crf', getCRFForQuality(options.quality));
    args.push('-b:v', '0');
    args.push('-c:a', 'libopus');
  }
  
  args.push('-y', outputFilename);
  
  onProgress({
    stage: 'encoding',
    progress: 50,
    message: 'Encoding video...',
  });
  
  await ffmpeg.exec(args);
  
  return outputFilename;
}

async function processMultipleSegments(
  ffmpeg: FFmpeg,
  segments: Array<{ startTime: number; endTime: number }>,
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void
): Promise<string> {
  // Extract each segment
  const segmentFiles: string[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentFile = `segment_${i}.webm`;
    
    onProgress({
      stage: 'processing',
      progress: 20 + (i / segments.length) * 40,
      message: `Processing segment ${i + 1} of ${segments.length}...`,
    });
    
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-ss', segment.startTime.toFixed(3),
      '-to', segment.endTime.toFixed(3),
      '-c', 'copy',
      '-y', segmentFile,
    ]);
    
    segmentFiles.push(segmentFile);
  }
  
  // Create concat file
  const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
  const encoder = new TextEncoder();
  await ffmpeg.writeFile('concat.txt', encoder.encode(concatContent));
  
  onProgress({
    stage: 'encoding',
    progress: 70,
    message: 'Merging segments...',
  });
  
  const outputFilename = options.format === 'mp4' ? 'output.mp4' : 'output.webm';
  
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
  ];
  
  if (options.format === 'mp4') {
    args.push('-c:v', 'libx264');
    args.push('-preset', getPresetForQuality(options.quality));
    args.push('-crf', getCRFForQuality(options.quality));
    args.push('-c:a', 'aac');
    args.push('-b:a', '128k');
    args.push('-movflags', '+faststart');
  } else {
    args.push('-c:v', 'libvpx-vp9');
    args.push('-crf', getCRFForQuality(options.quality));
    args.push('-b:v', '0');
    args.push('-c:a', 'libopus');
  }
  
  args.push('-y', outputFilename);
  
  await ffmpeg.exec(args);
  
  // Cleanup segment files
  for (const file of segmentFiles) {
    await deleteFileFromFFmpeg(ffmpeg, file);
  }
  await deleteFileFromFFmpeg(ffmpeg, 'concat.txt');
  
  return outputFilename;
}

function getPresetForQuality(quality: ExportOptions['quality']): string {
  switch (quality) {
    case 'low': return 'veryfast';
    case 'medium': return 'fast';
    case 'high': return 'medium';
    default: return 'fast';
  }
}

function getCRFForQuality(quality: ExportOptions['quality']): string {
  switch (quality) {
    case 'low': return '28';
    case 'medium': return '23';
    case 'high': return '18';
    default: return '23';
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getExportFilename(format: ExportOptions['format']): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `poor-mans-loom-${timestamp}.${format}`;
}

