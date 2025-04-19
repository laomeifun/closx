import { createOpenAI } from '@ai-sdk/openai';
import { env } from 'process';

// Environment variables for OpenAI configuration
export const OPENAI_API_KEY = env.OPENAI_API_KEY || 'your-api-key';
export const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
export const MODEL = env.MODEL || 'grok-3-beta';

// 创建自定义 OpenAI 提供者实例
export const myApi = createOpenAI({
    baseURL: OPENAI_API_BASE_URL,
    apiKey: OPENAI_API_KEY
});


