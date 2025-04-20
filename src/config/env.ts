import { env } from 'process';

/**
 * 环境变量配置
 */

// OpenAI 环境变量
export const OPENAI_API_KEY = env.OPENAI_API_KEY || 'your-api-key';
export const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
export const OPENAI_MODEL = env.OPENAI_MODEL || 'gpt-4o';

// Gemini 环境变量
export const GEMINI_API_KEY = env.GEMINI_API_KEY || 'your-gemini-api-key';
export const GEMINI_API_BASE_URL = env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
export const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-pro';

// Claude 环境变量
export const CLAUDE_API_KEY = env.CLAUDE_API_KEY || 'your-claude-api-key';
export const CLAUDE_API_BASE_URL = env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com';
export const CLAUDE_MODEL = env.CLAUDE_MODEL || 'claude-3-opus-20240229';

// 应用设置环境变量
export const ALLOW_AUTO_EXECUTION = env.ALLOW_AUTO_EXECUTION === 'true' ? true : false;
