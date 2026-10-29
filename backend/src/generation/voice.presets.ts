/**
 * Curated neural voices offered by the text-to-speech (voice) generator.
 * Backed by Microsoft Edge TTS (msedge-tts) — free, no GPU, hundreds of
 * neural voices. Multilingual voices speak Indonesian naturally too.
 *
 * This list is the backend's single source of truth for validation; the web
 * UI mirrors it via `VOICE_OPTIONS` in `@axon-ryzr/shared`.
 */
export interface VoicePreset {
  id: string;
  label: string;
  gender: 'male' | 'female';
  lang: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'id-ID-ArdiNeural', label: 'Ardi — Pria (Indonesia)', gender: 'male', lang: 'Indonesia' },
  { id: 'id-ID-GadisNeural', label: 'Gadis — Wanita (Indonesia)', gender: 'female', lang: 'Indonesia' },
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew — Pria (Multibahasa)', gender: 'male', lang: 'Multibahasa' },
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava — Wanita (Multibahasa)', gender: 'female', lang: 'Multibahasa' },
  { id: 'en-US-GuyNeural', label: 'Guy — Pria (English)', gender: 'male', lang: 'English' },
  { id: 'en-US-JennyNeural', label: 'Jenny — Wanita (English)', gender: 'female', lang: 'English' },
  { id: 'en-GB-RyanNeural', label: 'Ryan — Pria (British)', gender: 'male', lang: 'English (UK)' },
  { id: 'ja-JP-NanamiNeural', label: 'Nanami — Wanita (Jepang)', gender: 'female', lang: 'Jepang' },
];

export const VOICE_IDS: string[] = VOICE_PRESETS.map((v) => v.id);

export const DEFAULT_VOICE_ID = 'id-ID-ArdiNeural';

/** True when `id` is an offered voice. */
export function isAllowedVoice(id: string): boolean {
  return VOICE_IDS.includes(id);
}
