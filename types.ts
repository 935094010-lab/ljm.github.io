import { ThreeElements } from '@react-three/fiber';

export enum AppState {
  LOADING = 'LOADING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR'
}

export enum ShapeMode {
  TREE = 'TREE',
  TEXT_1 = 'TEXT_1', // 圣诞快乐
  TEXT_2 = 'TEXT_2', // 天天开心
  TEXT_3 = 'TEXT_3', // 一切顺利
}

export interface GestureState {
  isDetected: boolean;
  rotationSpeed: number; // -1 to 1 based on hand X position
  dispersionFactor: number; // 0 to 1 based on hand open/close (pinch)
  mode: ShapeMode;
}

export interface PhotoData {
  id: number;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}