import type {
  CreateAudioPayload,
  CreateImagePayload,
  CreateVideoPayload,
  CreateVoicePayload,
  Job,
} from '@axon-ryzr/shared';
import { apiClient } from '../api-client';

export const generationApi = {
  createImage: (payload: CreateImagePayload) =>
    apiClient.post<Job>('/generation/image', payload).then((r) => r.data),

  createVideo: (payload: CreateVideoPayload) =>
    apiClient.post<Job>('/generation/video', payload).then((r) => r.data),

  createAudio: (payload: CreateAudioPayload) =>
    apiClient.post<Job>('/generation/audio', payload).then((r) => r.data),

  createVoice: (payload: CreateVoicePayload) =>
    apiClient.post<Job>('/generation/voice', payload).then((r) => r.data),

  retry: (jobId: string) =>
    apiClient.post<Job>(`/generation/retry/${jobId}`).then((r) => r.data),
};
