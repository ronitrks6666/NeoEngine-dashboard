import { api } from './client';

export interface VoiceToNavResult {
  transcript: string;
  route: string;
  sectionId: string | null;
  action?: 'create_task' | 'create_staff';
  prefilledData?: Record<string, unknown>;
}

export const voiceApi = {
  toNav: async (audioBlob: Blob, outletId?: string | null): Promise<VoiceToNavResult> => {
    if (audioBlob.size === 0) {
      throw new Error('No audio recorded. Please speak and try again.');
    }
    const formData = new FormData();
    const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
    formData.append('audio', audioBlob, `recording.${ext}`);

    const url = outletId ? `/voice/to-nav?outletId=${encodeURIComponent(outletId)}` : '/voice/to-nav';
    const { data } = await api.post<{ success: boolean; data: VoiceToNavResult }>(url, formData);
    return data.data;
  },
};
