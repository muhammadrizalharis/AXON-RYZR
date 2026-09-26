'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Image as ImageIcon,
  Film,
  Music,
  SlidersHorizontal,
  Sparkles,
  Dices,
  Mic,
  MicOff,
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
  useGenerateAudio,
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

const STYLE_BOOSTERS: Record<string, string> = {
  none: 'highly detailed, sharp focus, professional quality',
  photorealistic:
    'photorealistic, ultra detailed, 8k, natural lighting, sharp focus',
  cinematic:
    'cinematic lighting, dramatic atmosphere, film grain, depth of field',
  anime: 'anime style, vibrant colors, clean lineart, studio quality',
  'digital-art':
    'digital art, intricate details, vivid colors, concept art quality',
  '3d-render': '3d render, octane render, global illumination, ray tracing',
  watercolor:
    'watercolor painting, soft washes, textured paper, delicate brushwork',
  neon: 'neon glow, cyberpunk palette, volumetric light, wet reflections',
};

const SURPRISE_PROMPTS = [
  'A crystalline dragon soaring over a neon metropolis at midnight, volumetric fog',
  'Ancient library inside a giant tree, floating books, god rays, magical dust',
  'Astronaut discovering a glowing alien garden, bioluminescent plants, wide shot',
  'Steampunk airship docking at a cloud city during golden hour',
  'Underwater temple ruins with schools of luminous fish, sun shafts',
  'Cyberpunk samurai standing in rain, neon signs reflecting on katana',
  'Cozy mountain cabin under aurora borealis, long exposure night sky',
  'Portrait of a robot artist painting a self-portrait, dramatic studio light',
];

// Selaras dengan @MaxLength(MAX_PROMPT_LENGTH) di DTO backend.
const MAX_PROMPT_LENGTH = 8000;

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
  const [videoSteps, setVideoSteps] = useState(25);
  const [lyrics, setLyrics] = useState('');
  const [musicDuration, setMusicDuration] = useState(60);
  const [advanced, setAdvanced] = useState(false);
  const [model, setModel] = useState<'aura' | 'genesis'>('aura');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop?.();
  }, []);

  const enhancePrompt = () => {
    const boost = STYLE_BOOSTERS[style] ?? STYLE_BOOSTERS.none;
    const lower = prompt.toLowerCase();
    const parts = boost.split(', ').filter((b) => !lower.includes(b));
    if (!prompt.trim() || parts.length === 0) return;
    setPrompt(`${prompt.trim().replace(/,\s*$/, '')}, ${parts.join(', ')}`);
  };

  const surpriseMe = () => {
    setPrompt(
      SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)],
    );
  };

  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop?.();
      return;
    }
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = Array.from(e.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim();
      if (!t) return;
      const cur = useDraftStore.getState().prompt;
      useDraftStore.getState().setPrompt(cur ? `${cur} ${t}` : t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const generateImage = useGenerateImage();
  const generateVideo = useGenerateVideo();
  const generateAudio = useGenerateAudio();
  const pending =
    generateImage.isPending ||
    generateVideo.isPending ||
    generateAudio.isPending;
  const canSubmit = prompt.trim().length >= 3 && !pending;

  // Wan 2.2 renders ~121 frames in ~3.5 minutes — give an honest estimate.
  const videoFrames = Math.max(5, Math.round(duration * fps));
  const videoEta = Math.max(1, Math.round((videoFrames / 121) * 3.5));

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

  const submitAudio = () => {
    if (!canSubmit) return;
    generateAudio.mutate({
      prompt,
      lyrics: lyrics.trim() || undefined,
      duration: musicDuration,
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

      {/* AI toolbar */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={enhancePrompt}
          disabled={!prompt.trim()}
          title="Perkaya prompt sesuai style terpilih"
          className="flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/5 px-2.5 py-1.5 text-xs font-medium text-cyan transition hover:bg-cyan/15 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" /> Enhance
        </button>
        <button
          type="button"
          onClick={surpriseMe}
          title="Prompt acak"
          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15"
        >
          <Dices className="h-3.5 w-3.5" /> Surprise
        </button>
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? 'Berhenti mendengarkan' : 'Diktekan prompt (suara)'}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
              listening
                ? 'animate-ring-pulse border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/15',
            )}
          >
            {listening ? (
              <MicOff className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {listening ? 'Listening…' : 'Voice'}
          </button>
        )}
        <span
          className={cn(
            'ml-auto font-mono text-[10px] tracking-wider',
            prompt.length > MAX_PROMPT_LENGTH ? 'text-red-400' : 'text-muted-foreground',
          )}
        >
          {prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()} chars · ≈{' '}
          {batchSize} credit{batchSize > 1 ? 's' : ''}
        </span>
      </div>

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
            title={`Perkiraan render ±${videoEta} menit (${duration}s × ${fps}fps = ${videoFrames} frame). Makin panjang durasi & FPS, makin lama.`}
            className="shimmer flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateVideo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Film className="h-4 w-4" />
            )}
            Generate Video
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">
              ±{videoEta}m
            </span>
          </button>
          <button
            type="button"
            onClick={submitAudio}
            disabled={!canSubmit}
            title="Prompt = style tags musik (mis. synthwave, 80s, energetic). Lirik & durasi di Advanced Settings."
            className="shimmer flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-cyan px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateAudio.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Music className="h-4 w-4" />
            )}
            Generate Music
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
                max={15}
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

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accent">
              <Music className="h-3.5 w-3.5" /> Music Options
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <div>
                <label className={labelCls}>
                  Lyrics (opsional — kosong = instrumental)
                </label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={'[verse]\nNeon lights across the sky\u2026\n[chorus]\nWe ride tonight\u2026'}
                  className="min-h-[72px] w-full resize-none rounded-lg border border-border/60 bg-background/50 p-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-accent/60"
                />
              </div>
              <div>
                <label className={labelCls}>Music Duration (s)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={musicDuration}
                  onChange={(e) => setMusicDuration(Number(e.target.value))}
                  className={numberCls}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
