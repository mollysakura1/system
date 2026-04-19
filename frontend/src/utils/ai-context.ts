import type { ChatMessageItem } from '../types';

export interface AiConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationWindowOptions {
  maxTurns?: number;
  maxMessageChars?: number;
  maxContextChars?: number;
}

const DEFAULT_MAX_CONTEXT_TURNS = 5;
const DEFAULT_MAX_MESSAGE_CHARS = 600;
const DEFAULT_MAX_CONTEXT_CHARS = 2400;

function normalizeConversationMessages(messages: ChatMessageItem[]): AiConversationMessage[] {
  const validMessages = messages
    .filter((message) => !message.loading && !message.error && Boolean(message.content.trim()))
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }));

  const normalized: AiConversationMessage[] = [];

  for (const message of validMessages) {
    const lastMessage = normalized.at(-1);

    if (!lastMessage) {
      if (message.role === 'assistant') continue;
      normalized.push(message);
      continue;
    }

    if (lastMessage.role === message.role) {
      normalized[normalized.length - 1] = message;
      continue;
    }

    normalized.push(message);
  }

  if (normalized.at(-1)?.role === 'user') {
    normalized.pop();
  }

  return normalized;
}

export function buildConversationWindow(messages: ChatMessageItem[], options: ConversationWindowOptions = {}): AiConversationMessage[] {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_CONTEXT_TURNS;
  const maxMessageChars = options.maxMessageChars ?? DEFAULT_MAX_MESSAGE_CHARS;
  const maxContextChars = options.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;
  const recentMessages = normalizeConversationMessages(messages)
    .slice(-(maxTurns * 2))
    .map((message) => ({
      ...message,
      content: message.content.slice(-maxMessageChars)
    }));

  const boundedMessages: AiConversationMessage[] = [];
  let totalChars = 0;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const message = recentMessages[index];
    if (totalChars + message.content.length > maxContextChars && boundedMessages.length) {
      break;
    }

    boundedMessages.unshift(message);
    totalChars += message.content.length;
  }

  return boundedMessages;
}
