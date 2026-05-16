import { getAliyunClient, getAliyunConfig } from '../lib/aliyun.js';

export const AI_SYSTEM_PROMPT =
  '你是一个电商运营分析助手，请始终使用中文回答。你会先阅读后端工具提供的经营数据、会话摘要和最近对话，再结合用户问题进行分析。输出要结构清晰、结论明确，优先基于数据回答，不要脱离数据臆测。';

type AiConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiAnalysisOptions = {
  prompt: string;
  businessContext?: string;
  memorySummary?: string;
  historyMessages?: AiConversationMessage[];
  signal?: AbortSignal;
};

const SUMMARY_SYSTEM_PROMPT =
  '你是会话记忆整理助手。请把旧摘要和最新一轮问答合并成一段简洁中文摘要，保留用户关注对象、重要结论、已给建议和待跟进事项。不要超过 500 字。';

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

  if (options.memorySummary) {
    messages.push({
      role: 'user',
      content: `以下是当前会话的长期摘要记忆，请用于理解用户持续关注的问题，但不要逐字复述：\n\n${options.memorySummary}`
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

export async function summarizeAiConversationMemory(options: {
  previousSummary: string;
  userMessage: string;
  assistantMessage: string;
}) {
  const userMessage = options.userMessage.trim();
  const assistantMessage = options.assistantMessage.trim();
  if (!userMessage && !assistantMessage) return options.previousSummary;

  try {
    const client = getAliyunClient();
    const { model } = getAliyunConfig();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `旧摘要：${options.previousSummary || '无'}`,
            '',
            `最新用户问题：${userMessage}`,
            '',
            `最新助手回答：${assistantMessage.slice(0, 2000)}`
          ].join('\n')
        }
      ]
    });

    const summary = response.choices[0]?.message?.content?.trim();
    return summary || buildFallbackSummary(options);
  } catch {
    return buildFallbackSummary(options);
  }
}

export function toReadableAiError(error: unknown) {
  const message = error instanceof Error ? error.message : '未知错误';
  return `AI 服务暂时不可用：${message}\n请检查百炼 API Key、Base URL、模型名称或网络连接后重试。`;
}

function buildFallbackSummary(options: {
  previousSummary: string;
  userMessage: string;
  assistantMessage: string;
}) {
  return [
    options.previousSummary,
    `用户关注：${options.userMessage.slice(0, 180)}`,
    `最近结论：${options.assistantMessage.replace(/\s+/g, ' ').slice(0, 260)}`
  ]
    .filter(Boolean)
    .join('\n')
    .slice(-900);
}
