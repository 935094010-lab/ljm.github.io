import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Ornaments } from './Ornaments';
import { TreeParticlesWithRef } from './TreeParticles';
import { GestureState, ShapeMode } from '../types';

interface SceneProps {
  gestureState: React.MutableRefObject<GestureState>;
  photoUrls: string[];
}

const SceneContent: React.FC<SceneProps> = ({ gestureState, photoUrls }) => {
  const groupRef = useRef<THREE.Group>(null);
  // Store smoothed dispersion for visual transitions
  const smoothDispersion = useRef(0);
  const smoothRotation = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const { rotationSpeed, dispersionFactor, mode } = gestureState.current;

    // Smooth dispersion (Lerp)
    smoothDispersion.current = THREE.MathUtils.lerp(smoothDispersion.current, dispersionFactor, delta * 2);

    // Smooth rotation speed and apply
    smoothRotation.current = THREE.MathUtils.lerp(smoothRotation.current, rotationSpeed, delta * 3);
    
    // Auto-rotate slowly if no gesture, otherwise use hand control
    // If Text mode, don't auto rotate the group, let particles handle it
    const baseRotation = mode === ShapeMode.TREE ? 0.05 * delta : 0;
    const gestureRotation = smoothRotation.current * 2 * delta; // Faster control
    
    groupRef.current.rotation.y += baseRotation + gestureRotation;
  });

  return (
    <>
      <group ref={groupRef}>
        <TreeParticlesWrapper gestureState={gestureState} />
        <OrnamentsWrapper gestureState={gestureState} photoUrls={photoUrls} />
      </group>

      {/* Lighting Setup for "Luxury" Feel */}
      <ambientLight intensity={0.1} />
      {/* Frontal Fill Light for Photos */}
      <pointLight position={[0, 2, 20]} intensity={0.5} color="#fff" distance={40} decay={1} />
      
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffaa00" distance={50} decay={2} />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#ff0000" distance={50} decay={2} />
      <pointLight position={[0, -10, 5]} intensity={0.8} color="#0000ff" distance={50} decay={2} />
      <spotLight position={[0, 20, 0]} angle={0.5} penumbra={1} intensity={2} castShadow color="#fff" />

      <Environment preset="night" />
    </>
  );
};

// Wrapper to bridge the Ref to the useFrame inside children without re-rendering parent constantly
const TreeParticlesWrapper = ({ gestureState }: { gestureState: React.MutableRefObject<GestureState> }) => {
    return <TreeParticlesWithRef gestureRef={gestureState} />;
};

const OrnamentsWrapper = ({ gestureState, photoUrls }: { gestureState: React.MutableRefObject<GestureState>, photoUrls: string[] }) => {
    return <OrnamentsWithRef gestureRef={gestureState} photoUrls={photoUrls} />;
};

const OrnamentsWithRef = ({ gestureRef, photoUrls }: { gestureRef: React.MutableRefObject<GestureState>, photoUrls: string[] }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((_, delta) => {
        if (groupRef.current) {
             const { dispersionFactor, mode } = gestureRef.current;
             
             // Expand ornaments group slightly more than particles for layering
             // If not Tree, logic handled inside individual ornaments
             const targetScale = mode === ShapeMode.TREE ? 1 + dispersionFactor * 1.5 : 1; 
             groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
             
             // Rotate counter to tree for parallax
             if (mode === ShapeMode.TREE) {
                groupRef.current.rotation.y -= 0.002;
             }
        }
    });

    return (
        <group ref={groupRef}>
             <Ornaments dispersion={0} photoUrls={photoUrls} gestureRef={gestureRef} /> 
        </group>
    )
}


export const Scene: React.FC<SceneProps> = ({ gestureState, photoUrls }) => {
  return (
    <div className="w-full h-full relative bg-[#050505]">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.8 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 24]} fov={50} />
        <SceneContent gestureState={gestureState} photoUrls={photoUrls} />
        
        <EffectComposer disableNormalPass>
            {/* Enhanced Bloom for "Cinema" look */}
            <Bloom luminanceThreshold={0.4} mipmapBlur intensity={1.2} radius={0.4} levels={8} />
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
        </EffectComposer>
        
        <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} maxDistance={40} minDistance={10} />
      </Canvas>
    </div>
  );
};
