import { getAliyunClient, getAliyunConfig } from '../lib/aliyun.js';

export const AI_SYSTEM_PROMPT =
  '你是一个电商运营分析助手，请始终使用中文回答。你会先阅读我提供的经营数据，再结合用户问题进行分析。输出要结构清晰、结论明确，优先基于数据回答，不要脱离数据臆测。';

type AiConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiAnalysisOptions = {
  prompt: string;
  businessContext?: string;
  historyMessages?: AiConversationMessage[];
  signal?: AbortSignal;
};

export async function* streamAiAnalysis(options: AiAnalysisOptions): AsyncGenerator<string, void, void> {
  const client = getAliyunClient();
  const { model } = getAliyunConfig();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: AI_SYSTEM_PROMPT }
  ];

  if (options.businessContext) {
    messages.push({
      role: 'user',
      content: `以下是当前业务上下文，请在回答时参考这些信息：\n\n${options.businessContext}`
    });
  }

  for (const message of options.historyMessages ?? []) {
    const content = message.content.trim();
    if (!content) continue;

    messages.push({
      role: message.role,
      content
    });
  }

  messages.push({
    role: 'user',
    content: options.prompt
  });

  const stream = await client.chat.completions.create(
    {
      model,
      stream: true,
      messages
    },
    { signal: options.signal }
  );

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (typeof delta === 'string' && delta) {
      yield delta;
    }
  }
}

export function toReadableAiError(error: unknown) {
  const message = error instanceof Error ? error.message : '未知错误';
  return `AI 服务暂时不可用：${message}\n请检查百炼 API Key、Base URL、模型名称或网络连接后重试。`;
}
