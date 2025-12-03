import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { gestureService } from './services/gestureService';
import { AppState, GestureState, ShapeMode } from './types';

const DEFAULT_PHOTOS = [
  "https://picsum.photos/id/1015/300/300",
  "https://picsum.photos/id/1018/300/300",
  "https://picsum.photos/id/1025/300/300",
  "https://picsum.photos/id/1035/300/300",
  "https://picsum.photos/id/1040/300/300",
  "https://picsum.photos/id/1050/300/300",
  "https://picsum.photos/id/1062/300/300",
  "https://picsum.photos/id/1074/300/300",
  "https://picsum.photos/id/237/300/300",
  "https://picsum.photos/id/238/300/300",
  "https://picsum.photos/id/239/300/300",
  "https://picsum.photos/id/240/300/300",
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Ref to store current gesture state for the 3D loop (avoids React re-renders)
  const gestureStateRef = useRef<GestureState>({
    isDetected: false,
    rotationSpeed: 0,
    dispersionFactor: 0,
    mode: ShapeMode.TREE
  });

  useEffect(() => {
    // 1. Initialize the AI Service
    const init = async () => {
      try {
        await gestureService.initialize();
        setAppState(AppState.READY);
      } catch (err) {
        console.error(err);
        setAppState(AppState.ERROR);
      }
    };
    init();
    
    return () => {
      gestureService.stop();
    };
  }, []);

  const handleGestureResult = useCallback((result: any) => {
    const hands = result.landmarks;
    
    if (hands && hands.length > 0) {
      const hand = hands[0]; // Take first hand
      
      // --- Finger Counting Logic ---
      // Landmarks: 
      // Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20
      // Finger is "up" if tip Y is less than PIP Y (Screen coords: 0 is top)
      // Note: Thumb logic is different (X axis usually), but simplistic Y check works for "High 5" vertical hand.
      
      const isIndexUp = hand[8].y < hand[6].y;
      const isMiddleUp = hand[12].y < hand[10].y;
      const isRingUp = hand[16].y < hand[14].y;
      const isPinkyUp = hand[20].y < hand[18].y;
      // Thumb is tricky depending on hand rotation, but for "1", "2", "3" gestures, we usually ignore thumb or check extension.
      
      let fingersUp = 0;
      if (isIndexUp) fingersUp++;
      if (isMiddleUp) fingersUp++;
      if (isRingUp) fingersUp++;
      if (isPinkyUp) fingersUp++;

      let currentMode = ShapeMode.TREE;

      // Logic for Gestures
      if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
          // Only Index up -> "1"
          currentMode = ShapeMode.TEXT_1;
      } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
          // Index + Middle -> "2"
          currentMode = ShapeMode.TEXT_2;
      } else if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp) {
          // Index + Middle + Ring -> "3"
          currentMode = ShapeMode.TEXT_3;
      } else if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
         // Open Palm (4+ fingers) -> TREE with Dispersion
         currentMode = ShapeMode.TREE;
      } else {
         // Fist or other -> TREE
         currentMode = ShapeMode.TREE;
      }

      // --- Dispersion & Rotation Logic (Only applies in TREE mode usually, but we calculate anyway) ---
      
      // Thumb tip: 4, Index tip: 8
      const thumbTip = hand[4];
      const indexTip = hand[8];
      const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
      );
      
      // Map 0.05->0.2 to 0->1
      const normalizedOpenness = Math.min(Math.max((distance - 0.05) * 6, 0), 1);
      
      // Center of screen is roughly 0.5
      const handCentroidX = (hand[0].x + hand[9].x) / 2;
      const rotationInput = (handCentroidX - 0.5) * -2; 
      
      gestureStateRef.current = {
        isDetected: true,
        rotationSpeed: rotationInput,
        dispersionFactor: normalizedOpenness,
        mode: currentMode
      };
      
    } else {
      // No hand detected
      gestureStateRef.current = {
        ...gestureStateRef.current,
        isDetected: false,
        // Decay dispersion, keep mode as is or reset to Tree? Let's reset to Tree for clean loop
        mode: ShapeMode.TREE, 
        dispersionFactor: Math.max(0, gestureStateRef.current.dispersionFactor - 0.05)
      };
    }
  }, []);

  const startExperience = async () => {
    if (!videoRef.current) return;
    try {
      await gestureService.startWebcam(videoRef.current, handleGestureResult);
      setAppState(AppState.RUNNING);
    } catch (err) {
      console.error("Camera failed", err);
      setAppState(AppState.ERROR);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files) as File[];
    
    // Convert all files to Data URLs using Promises
    const loadPromises = fileArray.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) resolve(e.target.result as string);
          else reject(new Error("Failed to load file"));
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    });

    try {
      const newPhotoUrls = await Promise.all(loadPromises);
      
      setPhotos(prev => {
        // If we are currently displaying the default set, replace them entirely with the user's photos.
        // Otherwise, append the new photos to the existing user set.
        const isDefaultSet = prev.length === DEFAULT_PHOTOS.length && prev[0] === DEFAULT_PHOTOS[0];
        
        if (isDefaultSet) {
          return newPhotoUrls;
        }
        return [...prev, ...newPhotoUrls];
      });
    } catch (error) {
      console.error("Error processing photos:", error);
    }
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Scene gestureState={gestureStateRef} photoUrls={photos} />
      </div>

      {/* UI Overlay */}
      <UI 
        appState={appState} 
        onStart={startExperience} 
        onUpload={handlePhotoUpload}
        videoRef={videoRef}
      />
    </div>
  );
};

export default App;