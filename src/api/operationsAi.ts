import { api } from '@/api/client';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type OperationsAiChatResponse = {
  success: boolean;
  data: {
    threadId?: string | null;
    intentType: 'ask' | 'analyze';
    tool: string;
    outletId: string;
    response: string;
    sources: string[];
    reasonCodes?: string[];
    telemetry?: {
      elapsedMs?: number;
    };
    generatedAt: string;
  };
};

export type OperationsAiThreadSummary = {
  id: string;
  sessionId: string;
  title: string;
  outletId?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
};

export type OperationsAiThreadDetail = {
  id: string;
  sessionId: string;
  title: string;
  outletId?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    meta?: string;
    createdAt: string;
  }>;
};

export const operationsAiApi = {
  async chat(message: string, outletId?: string, sessionId?: string, threadId?: string): Promise<OperationsAiChatResponse> {
    const response = await api.post('/operations-ai/chat', {
      message,
      ...(outletId ? { outletId } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(threadId ? { threadId } : {}),
    });
    return response.data;
  },
  async listThreads(): Promise<{ success: boolean; data: OperationsAiThreadSummary[] }> {
    const response = await api.get('/operations-ai/threads');
    return response.data;
  },
  async getThread(threadId: string): Promise<{ success: boolean; data: OperationsAiThreadDetail }> {
    const response = await api.get(`/operations-ai/threads/${threadId}`);
    return response.data;
  },
  async chatStream(
    message: string,
    opts: {
      outletId?: string;
      sessionId?: string;
      threadId?: string;
      onStatus?: (payload: any) => void;
      onFinal?: (payload: OperationsAiChatResponse['data']) => void;
      onError?: (payload: any) => void;
    }
  ): Promise<void> {
    const token = localStorage.getItem('neoengine_token');
    const response = await fetch(`${API_BASE_URL}/operations-ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        ...(opts.outletId ? { outletId: opts.outletId } : {}),
        ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
        ...(opts.threadId ? { threadId: opts.threadId } : {}),
      }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Streaming request failed (${response.status})`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';
      for (const chunk of chunks) {
        const eventLine = chunk.split('\n').find((l) => l.startsWith('event:'));
        const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
        if (!eventLine || !dataLine) continue;
        const event = eventLine.replace('event:', '').trim();
        let data: any = null;
        try {
          data = JSON.parse(dataLine.replace('data:', '').trim());
        } catch {
          data = null;
        }
        if (event === 'status') opts.onStatus?.(data);
        else if (event === 'final') opts.onFinal?.(data as OperationsAiChatResponse['data']);
        else if (event === 'error') opts.onError?.(data);
      }
    }
  },
};
