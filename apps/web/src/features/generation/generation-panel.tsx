'use client';

import { useState } from 'react';
import {
  Loader2,
  Image as ImageIcon,
  Film,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AspectRatio,
  GenerationStyle,
  ImageResolution,
} from '@axon-ryzr/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGenerateImage,
  useGenerateVideo,
} from '@/features/generation/use-generate';
import { useDraftStore } from '@/store/draft-store';
import { cn } from '@/lib/utils';

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: AspectRatio.SQUARE, label: 'Square · 1:1' },
  { value: AspectRatio.LANDSCAPE_16_9, label: 'Landscape · 16:9' },
  { value: AspectRatio.PORTRAIT_9_16, label: 'Portrait · 9:16' },
  { value: AspectRatio.LANDSCAPE_4_3, label: 'Standard · 4:3' },
  { value: AspectRatio.PORTRAIT_3_4, label: 'Portrait · 3:4' },
];

const STYLE_OPTIONS: { value: GenerationStyle; label: string }[] = [
  { value: GenerationStyle.NONE, label: 'None' },
  { value: GenerationStyle.PHOTOREALISTIC, label: 'Photorealistic' },
  { value: GenerationStyle.CINEMATIC, label: 'Cinematic' },
  { value: GenerationStyle.ANIME, label: 'Anime' },
  { value: GenerationStyle.DIGITAL_ART, label: 'Digital Art' },
  { value: GenerationStyle.THREE_D, label: '3D Render' },
  { value: GenerationStyle.WATERCOLOR, label: 'Watercolor' },
  { value: GenerationStyle.NEON, label: 'Neon / Cyberpunk' },
];

const RESOLUTION_OPTIONS: { value: ImageResolution; label: string }[] = [
  { value: ImageResolution.SD, label: 'SD · 512' },
  { value: ImageResolution.HD, label: 'HD · 768' },
  { value: ImageResolution.FHD, label: 'Full HD · 1024' },
  { value: ImageResolution.QHD, label: 'QHD · 1536' },
];

const labelCls =
  'mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground';
const numberCls =
  'h-10 w-full rounded-lg border border-border/60 bg-background/50 px-3 text-sm text-foreground outline-none transition focus:border-cyan/60';

export function GenerationPanel() {
  const prompt = useDraftStore((s) => s.prompt);
  const setPrompt = useDraftStore((s) => s.setPrompt);
  const aspectRatio = useDraftStore((s) => s.aspectRatio);
  const setAspectRatio = useDraftStore((s) => s.setAspectRatio);
  const style = useDraftStore((s) => s.style);
  const setStyle = useDraftStore((s) => s.setStyle);
  const resolution = useDraftStore((s) => s.resolution);
  const setResolution = useDraftStore((s) => s.setResolution);
  const duration = useDraftStore((s) => s.duration);
  const setDuration = useDraftStore((s) => s.setDuration);
  const fps = useDraftStore((s) => s.fps);
  const setFps = useDraftStore((s) => s.setFps);

  const [negativePrompt, setNegativePrompt] = useState('');
  const [batchSize, setBatchSize] = useState(1);
  const [imageSteps, setImageSteps] = useState(25);
  const [videoSteps, setVideoSteps] = useState(20);
  const [advanced, setAdvanced] = useState(false);
  const [model, setModel] = useState<'aura' | 'genesis'>('aura');

  const generateImage = useGenerateImage();
  const generateVideo = useGenerateVideo();
  const pending = generateImage.isPending || generateVideo.isPending;
  const canSubmit = prompt.trim().length >= 3 && !pending;

  const submitImage = () => {
    if (!canSubmit) return;
    generateImage.mutate({
      prompt,
      negativePrompt: negativePrompt || undefined,
      aspectRatio,
      style,
      resolution,
      batchSize,
      steps: imageSteps,
    });
  };

  const submitVideo = () => {
    if (!canSubmit) return;
    generateVideo.mutate({
      prompt,
      negativePrompt: negativePrompt || undefined,
      aspectRatio,
      style,
      resolution,
      duration,
      fps,
      steps: videoSteps,
    });
  };

  return (
    <div className="hud-panel rounded-2xl p-4 md:p-5">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submitImage();
          }
        }}
        placeholder="Describe your vision… e.g. A serene mountain landscape at golden hour, ultra detailed  (Ctrl+Enter = Generate Image)"
        className="min-h-[84px] w-full resize-none rounded-xl border border-cyan/20 bg-background/40 p-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan/60 focus:glow-cyan"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="w-44">
          <Select
            value={model}
            onValueChange={(v) => setModel(v as 'aura' | 'genesis')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aura">Aura AI v4.0</SelectItem>
              <SelectItem value="genesis">Genesis Motion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
            advanced
              ? 'border-cyan/60 text-cyan glow-cyan'
              : 'border-border/60 text-muted-foreground hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced Settings
        </button>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={submitImage}
            disabled={!canSubmit}
            className="shimmer flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateImage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            Generate Image
          </button>
          <button
            type="button"
            onClick={submitVideo}
            disabled={!canSubmit}
            className="shimmer flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateVideo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Film className="h-4 w-4" />
            )}
            Generate Video
          </button>
        </div>
      </div>

      {advanced && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <div>
            <label className={labelCls}>Negative prompt (optional)</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="blurry, low quality, distorted…"
              className="min-h-[52px] w-full resize-none rounded-lg border border-border/60 bg-background/50 p-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan/60"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Aspect Ratio</label>
              <Select
                value={aspectRatio}
                onValueChange={(v) => setAspectRatio(v as AspectRatio)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Style</label>
              <Select
                value={style}
                onValueChange={(v) => setStyle(v as GenerationStyle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Resolution</label>
              <Select
                value={resolution}
                onValueChange={(v) => setResolution(v as ImageResolution)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className={labelCls}>Batch</label>
              <input
                type="number"
                min={1}
                max={4}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className={numberCls}
              />
            </div>
            <div>
              <label className={labelCls}>Image Steps</label>
              <input
                type="number"
                min={1}
                max={60}
                value={imageSteps}
                onChange={(e) => setImageSteps(Number(e.target.value))}
                className={numberCls}
              />
            </div>
            <div>
              <label className={labelCls}>Duration (s)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={numberCls}
              />
            </div>
            <div>
              <label className={labelCls}>FPS</label>
              <input
                type="number"
                min={4}
                max={30}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className={numberCls}
              />
            </div>
            <div>
              <label className={labelCls}>Video Steps</label>
              <input
                type="number"
                min={1}
                max={60}
                value={videoSteps}
                onChange={(e) => setVideoSteps(Number(e.target.value))}
                className={numberCls}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
