import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PointMaterial } from '@react-three/drei';
import { GestureState, ShapeMode } from '../types';

interface TreeParticlesProps {
  gestureRef: React.MutableRefObject<GestureState>;
}

const COUNT = 45000;

// Helper to generate positions from Text
const generateTextPositions = (text: string, count: number): Float32Array => {
  const canvas = document.createElement('canvas');
  const size = 128; // Grid size
  canvas.width = size;
  canvas.height = size / 2; // Aspect ratio
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Float32Array(count * 3);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Songti SC", "SimSun", serif'; // Serif font for elegance
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const validPixels: number[] = [];

  for (let i = 0; i < canvas.width * canvas.height; i++) {
    // Check alpha or brightness
    if (data[i * 4] > 128) { // If pixel is bright
        validPixels.push(i);
    }
  }

  const positions = new Float32Array(count * 3);
  
  if (validPixels.length === 0) return positions;

  for (let i = 0; i < count; i++) {
    // Pick a random valid pixel for each particle to ensure density
    const pixelIndex = validPixels[i % validPixels.length]; // Cycle through pixels
    const px = pixelIndex % canvas.width;
    const py = Math.floor(pixelIndex / canvas.width);

    // Normalize to centered 3D coords
    // Scale: x from -8 to 8
    const x = (px / canvas.width - 0.5) * 16;
    const y = -(py / canvas.height - 0.5) * 8; // Flip Y because canvas Y is down
    const z = (Math.random() - 0.5) * 2; // Small depth volume

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  
  return positions;
};

export const TreeParticlesWithRef: React.FC<TreeParticlesProps> = ({ gestureRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Memoize all shape positions
  const { 
    positions, // Current buffer
    originalPositions, // Tree target
    text1Positions, 
    text2Positions, 
    text3Positions,
    colors 
  } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const orig = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    
    // --- 1. Generate Tree Shape ---
    const color1 = new THREE.Color("#0f5f3f"); // Deep green
    const color2 = new THREE.Color("#2fab6f"); // Bright green
    const color3 = new THREE.Color("#d4af37"); // Gold accents
    
    const height = 16;
    const width = 6;

    for (let i = 0; i < COUNT; i++) {
        const yNorm = Math.pow(Math.random(), 0.8);
        const y = (1 - yNorm) * height - (height / 2);
        const rBase = yNorm * width;
        const theta = i * 0.2 + Math.random() * 0.5;
        const r = rBase * (0.6 + Math.random() * 0.4); 

        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        pos[i*3] = x; 
        pos[i*3+1] = y; 
        pos[i*3+2] = z;

        orig[i*3] = x; 
        orig[i*3+1] = y; 
        orig[i*3+2] = z;

        // Colors
        const mix = Math.random();
        let c = new THREE.Color();
        if (mix > 0.95) c = color3; 
        else c.lerpColors(color1, color2, Math.random());
        
        col[i*3] = c.r;
        col[i*3+1] = c.g;
        col[i*3+2] = c.b;
    }

    // --- 2. Generate Text Shapes ---
    const txt1 = generateTextPositions("圣诞快乐", COUNT);
    const txt2 = generateTextPositions("天天开心", COUNT);
    const txt3 = generateTextPositions("一切顺利", COUNT);

    return { 
        positions: pos, 
        originalPositions: orig, 
        text1Positions: txt1,
        text2Positions: txt2,
        text3Positions: txt3,
        colors: col 
    };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const positionsArray = posAttr.array as Float32Array;
    
    const { dispersionFactor, mode } = gestureRef.current;
    
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      
      let tx = 0, ty = 0, tz = 0;
      let lerpFactor = 0.08; // Morph speed

      if (mode === ShapeMode.TREE) {
          // --- TREE LOGIC ---
          const ox = originalPositions[ix];
          const oy = originalPositions[iy];
          const oz = originalPositions[iz];

          const spread = 1 + dispersionFactor * 6;
          const breath = Math.sin(t * 2 + ox * 0.5) * 0.05 * (1 - dispersionFactor);
          
          const floatY = Math.sin(t + ox * 10) * 3 * dispersionFactor;
          const floatX = Math.cos(t * 0.5 + oy) * 2 * dispersionFactor;
          const floatZ = Math.sin(t * 0.3 + oz) * 2 * dispersionFactor;

          tx = ox * spread + floatX + (ox * breath);
          ty = oy + floatY;
          tz = oz * spread + floatZ + (oz * breath);
          
      } else {
          // --- TEXT LOGIC ---
          // Select target array based on mode
          let targetArr = text1Positions;
          if (mode === ShapeMode.TEXT_2) targetArr = text2Positions;
          if (mode === ShapeMode.TEXT_3) targetArr = text3Positions;

          const ox = targetArr[ix];
          const oy = targetArr[iy];
          const oz = targetArr[iz];
          
          // Subtle float for text
          const noise = Math.sin(t * 3 + i) * 0.05;
          
          tx = ox + noise;
          ty = oy + noise;
          tz = oz;
          
          // Speed up morphing to text slightly
          lerpFactor = 0.1;
      }

      // Interpolate current to target
      const cx = positionsArray[ix];
      const cy = positionsArray[iy];
      const cz = positionsArray[iz];

      positionsArray[ix] += (tx - cx) * lerpFactor;
      positionsArray[iy] += (ty - cy) * lerpFactor;
      positionsArray[iz] += (tz - cz) * lerpFactor;
    }
    
    posAttr.needsUpdate = true;
    
    // Rotate entire group: If Tree, rotate. If Text, stay frontal.
    if (mode === ShapeMode.TREE) {
        pointsRef.current.rotation.y = Math.sin(t * 0.05) * 0.05;
    } else {
        // Smoothly rotate back to 0
        pointsRef.current.rotation.y += (0 - pointsRef.current.rotation.y) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <PointMaterial
        transparent
        vertexColors
        size={0.08}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.9}
      />
    </points>
  );
};
