/**
 * Requests screen capture from the browser
 */
export const startScreenCapture = async (): Promise<MediaStream | null> => {
  try {
    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    return displayMedia;
  } catch (err) {
    console.error("Error starting screen capture:", err);
    return null;
  }
};

/**
 * Requests audio capture from the browser
 */
export const startAudioCapture = async (includeMicrophone: boolean): Promise<MediaStream | null> => {
  try {
    if (!includeMicrophone) {
      return new MediaStream(); // Return empty stream if microphone is not needed
    }
    
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    };

    const audioStream = await navigator.mediaDevices.getUserMedia(constraints);
    return audioStream;
  } catch (err) {
    console.error("Error starting audio capture:", err);
    return null;
  }
};

/**
 * Combines multiple media streams into one
 */
export const combineStreams = (streams: MediaStream[]): MediaStream => {
  const combinedStream = new MediaStream();
  
  streams.forEach(stream => {
    stream.getTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
  });
  
  return combinedStream;
};

/**
 * Creates a MediaRecorder from a MediaStream
 */
export const createRecorder = (stream: MediaStream): MediaRecorder => {
  const mimeType = getSupportedMimeType();
  const options = { mimeType };
  return new MediaRecorder(stream, options);
};

/**
 * Gets a supported MIME type for video recording
 */
export const getSupportedMimeType = (): string => {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4"
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  return "video/webm";
};

/**
 * Creates a downloadable URL from a Blob
 */
export const createVideoURL = (chunks: BlobPart[]): string => {
  const blob = new Blob(chunks, { type: getSupportedMimeType() });
  return URL.createObjectURL(blob);
};

/**
 * Downloads a video file
 */
export const downloadVideo = (url: string, filename: string = "recording.webm"): void => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
};

/**
 * Optimizes video for social media (stub function - would need backend processing)
 * In a real implementation, this would send the video to a server for processing
 */
export const optimizeForSocialMedia = (videoBlob: Blob): Promise<Blob> => {
  // This is a client-side stub - in a real app this would call a backend API
  // that would process the video with ffmpeg or similar
  return Promise.resolve(videoBlob);
}; 