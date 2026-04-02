import OpenAI from 'openai';

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-plus';

let client: OpenAI | null = null;

export interface AliyunRuntimeConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export function getAliyunConfig(): AliyunRuntimeConfig {
  const apiKey = process.env.ALIYUN_API_KEY?.trim() ?? '';
  const baseURL = process.env.ALIYUN_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.ALIYUN_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error('Missing ALIYUN_API_KEY. Please configure backend/.env before using /api/ai/stream.');
  }

  return {
    apiKey,
    baseURL,
    model
  };
}

export function getAliyunClient() {
  if (client) return client;

  const config = getAliyunConfig();
  client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL
  });

  return client;
}
