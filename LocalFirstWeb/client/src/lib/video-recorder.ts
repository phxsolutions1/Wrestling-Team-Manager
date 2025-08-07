export interface VideoRecordingOptions {
  onDataAvailable?: (data: Blob) => void;
  onStart?: () => void;
  onStop?: (data: Blob) => void;
  onError?: (error: Error) => void;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private options: VideoRecordingOptions;

  constructor(options: VideoRecordingOptions = {}) {
    this.options = options;
  }

  async initializeCamera(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });
      
      videoElement.srcObject = this.stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Failed to access camera');
      this.options.onError?.(errorMessage);
      throw errorMessage;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.stream) {
      throw new Error('Camera not initialized - no media stream available');
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      throw new Error(`Recording already in progress (state: ${this.mediaRecorder.state})`);
    }

    try {
      this.recordedChunks = [];
      
      // Check for supported formats
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const options: MediaRecorderOptions = { mimeType };

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.options.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          this.options.onStop?.(blob);
        } else {
          this.options.onError?.(new Error('No recording data available'));
        }
      };

      this.mediaRecorder.onerror = (event: any) => {
        const error = new Error(`MediaRecorder error: ${event.error || 'Unknown recording error'}`);
        this.options.onError?.(error);
      };

      this.mediaRecorder.onstart = () => {
        this.options.onStart?.();
      };

      // Start recording with data collection every second
      this.mediaRecorder.start(1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Failed to start recording');
      this.options.onError?.(errorMessage);
      throw errorMessage;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  cleanup(): void {
    this.stopRecording();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  isStreamActive(): boolean {
    return this.stream !== null && this.stream.active && 
           this.stream.getTracks().some(track => track.readyState === 'live');
  }

  getRecordingState(): string {
    return this.mediaRecorder?.state || 'inactive';
  }

  saveVideoLocally(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return url;
  }
}
