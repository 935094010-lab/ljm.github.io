import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image, Float, Sparkles, Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { GestureState, ShapeMode } from '../types';

interface OrnamentsProps {
  dispersion: number;
  photoUrls: string[];
  gestureRef: React.MutableRefObject<GestureState>;
}

// --- Components ---

const Gift: React.FC<{ position: [number, number, number]; color: string; gestureRef: React.MutableRefObject<GestureState>; delay: number }> = ({ position, color, gestureRef, delay }) => {
  const ref = useRef<THREE.Group>(null);
  const startPos = new THREE.Vector3(...position);
  // Random dispersion direction
  const dir = useMemo(() => new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const { dispersionFactor, mode } = gestureRef.current;
    
    // VISIBILITY: If not in TREE mode, scale to zero
    if (mode !== ShapeMode.TREE) {
        ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 0, 0.1));
        return;
    }

    // Target position - scatter further away during carousel mode to clear view
    const spreadDistance = 8 + (dispersionFactor * 20); 
    const spread = startPos.clone().addScaledVector(dir, dispersionFactor * spreadDistance);
    const floatY = Math.sin(t * 2 + delay) * 0.5;
    
    // Lerp
    ref.current.position.lerp(new THREE.Vector3(spread.x, spread.y + floatY, spread.z), 0.1);
    
    // Rotation
    ref.current.rotation.x = Math.sin(t + delay) * 0.5;
    ref.current.rotation.y += 0.01;
    
    // Scale Logic
    const targetScale = 0.4 * (1 - dispersionFactor * 0.8);
    const currentScale = ref.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    ref.current.scale.setScalar(nextScale);
  });

  return (
    <group ref={ref} position={position} scale={0.4}>
        {/* Box */}
        <Box args={[1, 1, 1]}>
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </Box>
        {/* Ribbons */}
        <Box args={[1.02, 0.2, 1.02]}>
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
        </Box>
        <Box args={[0.2, 1.02, 1.02]}>
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
        </Box>
    </group>
  );
};

const Bauble: React.FC<{ position: [number, number, number]; color: string; gestureRef: React.MutableRefObject<GestureState>; delay: number }> = ({ position, color, gestureRef, delay }) => {
    const ref = useRef<THREE.Mesh>(null);
    const startPos = new THREE.Vector3(...position);
    const dir = useMemo(() => new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(), []);
  
    useFrame((state) => {
      if (!ref.current) return;
      const t = state.clock.elapsedTime;
      const { dispersionFactor, mode } = gestureRef.current;
      
      // VISIBILITY check
      if (mode !== ShapeMode.TREE) {
        ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 0, 0.1));
        return;
      }

      const spreadDistance = 5 + (dispersionFactor * 15);
      const spread = startPos.clone().addScaledVector(dir, dispersionFactor * spreadDistance);
      
      ref.current.position.lerp(spread, 0.1);
      ref.current.position.y += Math.sin(t * 3 + delay) * 0.005;

      // Scale down when dispersed
      const targetScale = 1 - dispersionFactor * 0.8;
      const currentScale = ref.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      ref.current.scale.setScalar(nextScale);
    });
  
    return (
        <Sphere ref={ref} args={[0.25, 32, 32]} position={position}>
            <meshStandardMaterial color={color} roughness={0.1} metalness={0.8} />
        </Sphere>
    );
};

interface SolidPolaroidProps {
    url: string;
    position: [number, number, number];
    rotation: [number, number, number];
    gestureRef: React.MutableRefObject<GestureState>;
    index: number;
    total: number;
}

const SolidPolaroid: React.FC<SolidPolaroidProps> = ({ url, position, rotation, gestureRef, index, total }) => {
  const groupRef = useRef<THREE.Group>(null);
  const startPos = useRef(new THREE.Vector3(...position));
  const startRot = useRef(new THREE.Euler(...rotation));
  
  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const smoothD = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const { dispersionFactor: rawD, mode } = gestureRef.current; 
      
      // VISIBILITY Check
      if (mode !== ShapeMode.TREE) {
        // Shrink out of existence
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, 0, delta * 5));
        return;
      }

      smoothD.current = THREE.MathUtils.lerp(smoothD.current, rawD, delta * 3);
      const d = smoothD.current;
      
      const t = state.clock.elapsedTime;

      // Carousel Parameters
      const carouselRadius = 16; 
      const carouselSpeed = 0.15; 
      const theta = (index / total) * Math.PI * 2 + (t * carouselSpeed);
      
      const cx = Math.sin(theta) * carouselRadius;
      const cz = Math.cos(theta) * carouselRadius;
      
      const cy = THREE.MathUtils.lerp(startPos.current.y, Math.sin(index) * 2, d); 

      const carouselPos = new THREE.Vector3(cx, cy, cz);
      
      // Mix based on dispersion
      const mix = THREE.MathUtils.smoothstep(d, 0.1, 0.9);
      
      // Lerp Position
      groupRef.current.position.lerpVectors(startPos.current, carouselPos, mix);

      // --- Rotation Calculation ---
      if (mix > 0.01) {
          if (groupRef.current.parent) {
             targetVec.copy(state.camera.position);
             groupRef.current.parent.worldToLocal(targetVec);
             dummyObj.position.copy(groupRef.current.position);
             dummyObj.lookAt(targetVec);
             groupRef.current.quaternion.slerp(dummyObj.quaternion, delta * 4 * mix);
          }
      } else {
          dummyObj.setRotationFromEuler(startRot.current);
          groupRef.current.quaternion.slerp(dummyObj.quaternion, delta * 2);
      }

      // --- Scale Calculation ---
      let targetScale = 1;
      
      if (mix > 0.01) {
          const baseScale = 2.5; 
          const zNorm = Math.cos(theta); 
          const focusBoost = THREE.MathUtils.smoothstep(zNorm, 0.2, 1.0) * 2.5; 
          targetScale = baseScale + focusBoost;
      }
      
      const currentScale = groupRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 4);
      groupRef.current.scale.setScalar(nextScale);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Box args={[1.2, 1.4, 0.05]} position={[0, 0, -0.025]}>
            <meshStandardMaterial color="#f0f0f0" roughness={0.6} metalness={0.1} />
        </Box>
        <Image url={url} position={[0, 0.1, 0.01]} scale={[1, 1]} />
        <mesh position={[0, 0, -0.051]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[1.1, 1.3]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.9} />
        </mesh>
      </Float>
    </group>
  );
};

export const Ornaments: React.FC<OrnamentsProps> = ({ photoUrls, gestureRef }) => {
  
  // Memoize Photos
  const photos = useMemo(() => {
    return photoUrls.map((url, i) => {
      // Spiral distribution for tree mode
      const theta = (i / photoUrls.length) * Math.PI * 10; 
      const y = (i / photoUrls.length) * 12 - 6;
      const r = (1 - (y + 7) / 16) * 5 + 1.2; 
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      
      return {
        url,
        position: [x, y, z] as [number, number, number],
        rotation: [0, -theta + Math.PI / 2, 0] as [number, number, number]
      };
    });
  }, [photoUrls]);

  // Memoize Gifts & Baubles
  const decorations = useMemo(() => {
    const items = [];
    const colors = ["#d32f2f", "#1976d2", "#fbc02d", "#7b1fa2", "#388e3c"];
    
    // Create 40 Gifts
    for(let i=0; i<40; i++) {
        const y = (Math.random() * 14) - 7;
        const rBase = (1 - (y + 7) / 16) * 5; 
        const r = rBase * (0.5 + Math.random() * 0.5); 
        const theta = Math.random() * Math.PI * 2;
        
        items.push({
            type: 'gift',
            position: [Math.cos(theta) * r, y, Math.sin(theta) * r] as [number, number, number],
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 10
        });
    }

    // Create 60 Baubles
    for(let i=0; i<60; i++) {
        const y = (Math.random() * 14) - 7;
        const rBase = (1 - (y + 7) / 16) * 5; 
        const r = rBase * (0.8 + Math.random() * 0.3); 
        const theta = Math.random() * Math.PI * 2;
        
        items.push({
            type: 'bauble',
            position: [Math.cos(theta) * r, y, Math.sin(theta) * r] as [number, number, number],
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 10
        });
    }

    return items;
  }, []);

  return (
    <group>
        {/* Environmental Sparkles */}
        <Sparkles count={500} scale={20} size={3} speed={0.4} opacity={0.6} color="#ffffff" />
        <Sparkles count={300} scale={15} size={5} speed={0.2} opacity={0.8} color="#ffd700" noise={0.5} />

        {/* Photos */}
        {photos.map((p, i) => (
            <SolidPolaroid 
                key={`photo-${i}`} 
                {...p} 
                gestureRef={gestureRef} 
                index={i} 
                total={photos.length} 
            />
        ))}

        {/* Decorations */}
        {decorations.map((d, i) => (
            d.type === 'gift' ? 
            <Gift key={`gift-${i}`} position={d.position} color={d.color} gestureRef={gestureRef} delay={d.delay} /> :
            <Bauble key={`bauble-${i}`} position={d.position} color={d.color} gestureRef={gestureRef} delay={d.delay} />
        ))}
    </group>
  );
};
