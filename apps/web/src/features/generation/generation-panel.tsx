'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Wand2, Film } from 'lucide-react';
import {
  AspectRatio,
  GenerationStyle,
  ImageResolution,
} from '@axon-ryzr/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  useGenerateImage,
  useGenerateVideo,
} from '@/features/generation/use-generate';

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

export function GenerationPanel() {
  const [tab, setTab] = useState<'image' | 'video'>('image');

  // Shared fields
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    AspectRatio.SQUARE,
  );
  const [style, setStyle] = useState<GenerationStyle>(GenerationStyle.NONE);
  const [resolution, setResolution] = useState<ImageResolution>(
    ImageResolution.FHD,
  );

  // Image
  const [batchSize, setBatchSize] = useState(1);
  const [imageSteps, setImageSteps] = useState(25);

  // Video
  const [duration, setDuration] = useState(2);
  const [fps, setFps] = useState(8);
  const [videoSteps, setVideoSteps] = useState(20);

  const generateImage = useGenerateImage();
  const generateVideo = useGenerateVideo();
  const pending = generateImage.isPending || generateVideo.isPending;

  const canSubmit = prompt.trim().length >= 3 && !pending;

  const handleGenerate = () => {
    if (!canSubmit) return;
    if (tab === 'image') {
      generateImage.mutate({
        prompt,
        negativePrompt: negativePrompt || undefined,
        aspectRatio,
        style,
        resolution,
        batchSize,
        steps: imageSteps,
      });
    } else {
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
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 md:p-5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'image' | 'video')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">
              <Wand2 className="h-4 w-4" /> Image
            </TabsTrigger>
            <TabsTrigger value="video">
              <Film className="h-4 w-4" /> Video
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A serene mountain landscape at golden hour, ultra detailed…"
                className="min-h-[96px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="negative">Negative prompt (optional)</Label>
              <Textarea
                id="negative"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, distorted…"
                className="min-h-[56px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Aspect ratio</Label>
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

              <div className="space-y-2">
                <Label>Style</Label>
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

              <div className="space-y-2">
                <Label>Resolution</Label>
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

            <TabsContent value="image" className="mt-0 space-y-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch size</Label>
                  <Input
                    id="batch"
                    type="number"
                    min={1}
                    max={4}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isteps">Steps</Label>
                  <Input
                    id="isteps"
                    type="number"
                    min={1}
                    max={60}
                    value={imageSteps}
                    onChange={(e) => setImageSteps(Number(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="video" className="mt-0 space-y-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (s)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={10}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fps">FPS</Label>
                  <Input
                    id="fps"
                    type="number"
                    min={4}
                    max={30}
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vsteps">Steps</Label>
                  <Input
                    id="vsteps"
                    type="number"
                    min={1}
                    max={60}
                    value={videoSteps}
                    onChange={(e) => setVideoSteps(Number(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>

            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleGenerate}
              disabled={!canSubmit}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate {tab === 'image' ? 'Image' : 'Video'}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
