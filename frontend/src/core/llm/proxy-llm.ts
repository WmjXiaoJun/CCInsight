/**
 * Proxy LLM Client
 *
 * Routes LLM requests through the ccinsight backend to avoid CORS issues.
 * This is used when the LLM provider doesn't support CORS for browser requests.
 */

import { getBackendUrl } from '../services/backend-client';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

/**
 * Create a streaming LLM response through the backend proxy
 */
export async function* streamLLMThroughProxy(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  temperature: number = 0.1,
  maxTokens?: number,
): AsyncGenerator<{ type: 'content' | 'done' | 'error'; content?: string; error?: string }> {
  try {
    const body = {
      model,
      messages,
      stream: true,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    };

    const response = await fetch(`${getBackendUrl()}/api/llm/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey, body }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      yield { type: 'error', error: error.error || `HTTP ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const parsed: LLMStreamChunk = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'content', content };
            }
            if (parsed.choices?.[0]?.finish_reason) {
              yield { type: 'done' };
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    yield { type: 'done' };
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : 'Request failed' };
  }
}

/**
 * Get a non-streaming LLM response through the backend proxy
 */
export async function callLLMThroughProxy(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  temperature: number = 0.1,
  maxTokens?: number,
): Promise<string> {
  const body = {
    model,
    messages,
    stream: false,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  };

  const response = await fetch(`${getBackendUrl()}/api/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl, apiKey, body }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
