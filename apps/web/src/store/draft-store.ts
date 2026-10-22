import { create } from 'zustand';
import {
  AspectRatio,
  GenerationStyle,
  ImageResolution,
} from '@axon-ryzr/shared';

/**
 * Shared generation draft — lets the Workspace Panel show live parameters and
 * lets prompt library / history items fill the prompt bar.
 */
interface DraftState {
  prompt: string;
  aspectRatio: AspectRatio;
  style: GenerationStyle;
  resolution: ImageResolution;
  duration: number;
  fps: number;
  setPrompt: (v: string) => void;
  setAspectRatio: (v: AspectRatio) => void;
  setStyle: (v: GenerationStyle) => void;
  setResolution: (v: ImageResolution) => void;
  setDuration: (v: number) => void;
  setFps: (v: number) => void;
}

export const useDraftStore = create<DraftState>()((set) => ({
  prompt: '',
  aspectRatio: AspectRatio.LANDSCAPE_16_9,
  style: GenerationStyle.CINEMATIC,
  resolution: ImageResolution.FHD,
  duration: 8,
  fps: 24,
  setPrompt: (v) => set({ prompt: v }),
  setAspectRatio: (v) => set({ aspectRatio: v }),
  setStyle: (v) => set({ style: v }),
  setResolution: (v) => set({ resolution: v }),
  setDuration: (v) => set({ duration: v }),
  setFps: (v) => set({ fps: v }),
}));
