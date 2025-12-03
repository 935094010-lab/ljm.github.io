import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";

// Singleton to manage the AI model
class GestureService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private rafId: number | null = null;
  
  // Callback to update React state/refs
  private onResultCallback: ((result: any) => void) | null = null;

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      console.log("HandLandmarker loaded");
    } catch (error) {
      console.error("Failed to load MediaPipe:", error);
      throw error;
    }
  }

  async startWebcam(videoElement: HTMLVideoElement, onResult: (result: any) => void) {
    if (!this.handLandmarker) {
      throw new Error("HandLandmarker not initialized");
    }

    this.video = videoElement;
    this.onResultCallback = onResult;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: "user"
      }
    });

    this.video.srcObject = stream;
    this.video.addEventListener("loadeddata", () => {
      this.predictWebcam();
    });
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.video && this.video.srcObject) {
      const tracks = (this.video.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      this.video.srcObject = null;
    }
  }

  private predictWebcam = () => {
    if (!this.handLandmarker || !this.video) return;

    let startTimeMs = performance.now();
    
    if (this.lastVideoTime !== this.video.currentTime) {
      this.lastVideoTime = this.video.currentTime;
      const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
      
      if (this.onResultCallback) {
        this.onResultCallback(results);
      }
    }

    this.rafId = requestAnimationFrame(this.predictWebcam);
  };
}

export const gestureService = new GestureService();
