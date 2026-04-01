/**
 * Proxy Chat Model
 *
 * A LangChain-compatible chat model that routes requests through the ccinsight backend proxy.
 * This avoids CORS issues when calling third-party LLM APIs from the browser.
 */

import { BaseChatModel, type BaseChatModelParams, type BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { AIMessage, AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { ChatGeneration, ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs';
import { getBackendUrl } from '../../services/backend-client';

/**
 * Convert LangChain messages to OpenAI message format
 */
function messagesToOpenAIFormat(messages: BaseMessage[]): Array<{ role: string; content: string }> {
  return messages.map((msg) => {
    if (msg._getType() === 'ai') {
      return { role: 'assistant', content: msg.content as string };
    } else if (msg._getType() === 'human') {
      return { role: 'user', content: msg.content as string };
    } else if (msg._getType() === 'system') {
      return { role: 'system', content: msg.content as string };
    } else if (msg._getType() === 'tool') {
      return { role: 'tool', content: msg.content as string };
    } else {
      return { role: 'user', content: msg.content as string };
    }
  });
}

/**
 * Configuration for the proxy chat model
 */
export interface ProxyChatModelConfig {
  /** The actual LLM provider base URL */
  baseUrl: string;
  /** API key for the LLM provider */
  apiKey?: string;
  /** Model name to use */
  model: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Streaming enabled */
  streaming?: boolean;
}

/**
 * A LangChain-compatible chat model that proxies requests through the backend
 */
export class ProxyChatModel extends BaseChatModel {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  streaming: boolean;

  constructor(fields: Partial<ProxyChatModelConfig> & { baseUrl: string; model: string }) {
    super(fields as BaseChatModelParams);
    this.baseUrl = fields.baseUrl;
    this.apiKey = fields.apiKey || '';
    this.model = fields.model;
    this.temperature = fields.temperature ?? 0.1;
    this.maxTokens = fields.maxTokens;
    this.streaming = fields.streaming ?? true;
  }

  _llmType() {
    return 'proxy-chat';
  }

  bindTools(
    tools: any[],
    _options?: Partial<BaseChatModelCallOptions>,
  ): BaseChatModel {
    // Return a new instance with tools bound (stored for later use)
    const instance = new ProxyChatModel({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      streaming: this.streaming,
    });
    // Store tools for later use in _generate/_streamResponse
    (instance as any)._boundTools = tools;
    return instance;
  }

  async _generate(
    messages: BaseMessage[],
    options?: Partial<BaseChatModelCallOptions>,
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const formattedMessages = messagesToOpenAIFormat(messages);
    const backendUrl = getBackendUrl();
    console.log('[ProxyChatModel] Backend URL:', backendUrl);
    console.log('[ProxyChatModel] Base URL:', this.baseUrl);
    console.log('[ProxyChatModel] Model:', this.model);

    // Build request body
    const body: Record<string, unknown> = {
      model: this.model,
      messages: formattedMessages,
      stream: false,
      temperature: this.temperature,
    };
    if (this.maxTokens) {
      body.max_tokens = this.maxTokens;
    }

    // Include tools if bound
    const tools = (this as any)._boundTools;
    if (tools && tools.length > 0) {
      body.tools = tools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description || '',
          parameters: t.parameters || { type: 'object', properties: {} },
        },
      }));
    }

    try {
      console.log('[ProxyChatModel] Sending request to:', `${backendUrl}/api/llm/chat`);
      // Route through backend proxy
      const response = await fetch(`${backendUrl}/api/llm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: this.baseUrl,
          apiKey: this.apiKey,
          body,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`LLM Error: ${data.error}`);
      }
      const content = data.choices?.[0]?.message?.content || '';

      return {
        generations: [
          {
            text: content,
            message: new AIMessage({ content }),
            generationInfo: {},
          },
        ],
        llmOutput: {},
      };
    } catch (error) {
      console.error('[ProxyChatModel] Full error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`ProxyChatModel error: ${String(error)}`);
    }
  }

  async *_streamResponse(
    messages: BaseMessage[],
    options?: Partial<BaseChatModelCallOptions>,
    _runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const formattedMessages = messagesToOpenAIFormat(messages);

    // Build request body
    const body: Record<string, unknown> = {
      model: this.model,
      messages: formattedMessages,
      stream: true,
      temperature: this.temperature,
    };
    if (this.maxTokens) {
      body.max_tokens = this.maxTokens;
    }

    // Include tools if bound
    const tools = (this as any)._boundTools;
    if (tools && tools.length > 0) {
      body.tools = tools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description || '',
          parameters: t.parameters || { type: 'object', properties: {} },
        },
      }));
    }

    // Route through backend proxy with streaming
    const response = await fetch(`${getBackendUrl()}/api/llm/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
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
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield new ChatGenerationChunk({
                  text: content,
                  message: new AIMessageChunk({ content }),
                  generationInfo: { finish_reason: parsed.choices?.[0]?.finish_reason },
                });
              }
              if (parsed.choices?.[0]?.finish_reason) {
                return;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
