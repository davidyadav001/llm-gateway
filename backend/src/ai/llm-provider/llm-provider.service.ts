import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LlmResponse {
  text: string;
  tokenUsage: number;
}

// Single point of contact with the outside model provider. Nothing else in
// the app is allowed to call an LLM SDK directly - this keeps the gateway
// the sole egress path, which is central to the governance story (see README
// threat model: "bypassing the gateway").
@Injectable()
export class LlmProviderService {
  private static readonly REQUEST_TIMEOUT_MS = 30_000;
  private static readonly MAX_RESPONSE_BYTES = 1_000_000;

  constructor(private readonly configService: ConfigService) {}

  async complete(model: string, prompt: string): Promise<LlmResponse> {
    const provider = this.configService.get<string>('llm.provider');

    switch (provider) {
      case 'anthropic':
        return this.callAnthropic(model, prompt);
      case 'openai':
        return this.callOpenAi(model, prompt);
      case 'mock':
      default:
        return this.callMock(model, prompt);
    }
  }

  private async callMock(model: string, prompt: string): Promise<LlmResponse> {
    // Deterministic stand-in so the whole pipeline can be exercised and
    // tested without a real API key or network access.
    const text = `[mock:${model}] response to a ${prompt.length}-character prompt.`;
    return { text, tokenUsage: Math.ceil(prompt.length / 4) + 20 };
  }

  private async callAnthropic(model: string, prompt: string): Promise<LlmResponse> {
    const apiKey = this.configService.get<string>('llm.anthropicApiKey');
    if (!apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LlmProviderService.REQUEST_TIMEOUT_MS);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      const data: any = await this.readJson(response);
      clearTimeout(timeout);
      const text = (data.content || [])
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
      const tokenUsage = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      return { text, tokenUsage };
    } catch (err) {
      throw new InternalServerErrorException('Failed to reach LLM provider');
    }
  }

  private async callOpenAi(model: string, prompt: string): Promise<LlmResponse> {
    const apiKey = this.configService.get<string>('llm.openaiApiKey');
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LlmProviderService.REQUEST_TIMEOUT_MS);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      const data: any = await this.readJson(response);
      clearTimeout(timeout);
      const text = data.choices?.[0]?.message?.content || '';
      const tokenUsage = data.usage?.total_tokens || 0;
      return { text, tokenUsage };
    } catch (err) {
      throw new InternalServerErrorException('Failed to reach LLM provider');
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > LlmProviderService.MAX_RESPONSE_BYTES) {
      throw new Error('LLM provider response too large');
    }
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > LlmProviderService.MAX_RESPONSE_BYTES) {
      throw new Error('LLM provider response too large');
    }
    return JSON.parse(body);
  }
}
