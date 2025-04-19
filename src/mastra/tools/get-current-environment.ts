import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import os from 'os';
import process from 'process';

/**
 * 环境信息接口定义
 */
export interface EnvironmentInfo {
  /** 当前工作目录 */
  cwd: string;
  /** 当前用户名 */
  user: string;
  /** 默认Shell */
  shell: string | null;
  /** 系统PATH环境变量 */
  path: string | null;
  /** PATH环境变量拆分为数组（可选） */
  pathEntries?: string[];
  /** 操作系统平台 */
  platform: string;
  /** 操作系统版本 */
  osRelease: string;
  /** 操作系统类型 */
  osType: string;
  /** 系统架构 */
  arch: string;
  /** 系统主机名 */
  hostname: string;
  /** Node.js版本 */
  nodeVersion: string;
  /** 语言环境设置 */
  lang: string | null;
  /** 用户主目录 */
  home: string;
  /** 系统运行时间（秒） */
  uptime: number;
  /** 内存信息 */
  memory: {
    /** 总内存（字节） */
    total: number;
    /** 空闲内存（字节） */
    free: number;
  };
  /** CPU信息 */
  cpus: Array<{
    /** CPU型号 */
    model: string;
    /** CPU速度（MHz） */
    speed: number;
  }>;
}

/**
 * 获取当前环境信息的工具
 * 返回系统环境的详细信息，包括工作目录、用户、Shell、PATH等
 */
export const getCurrentEnvironmentTool = createTool({
  id: 'get-current-environment',
  description: '获取当前系统环境的详细信息',
  inputSchema: z.object({
    includePathDetails: z.boolean().optional().describe('是否包含PATH环境变量的详细分析，默认为false'),
  }),
  outputSchema: z.object({
    cwd: z.string().describe('当前工作目录'),
    user: z.string().describe('当前用户名'),
    shell: z.string().nullable().describe('默认Shell'),
    path: z.string().nullable().describe('系统PATH环境变量'),
    pathEntries: z.array(z.string()).optional().describe('PATH环境变量拆分为数组'),
    platform: z.string().describe('操作系统平台（如linux、darwin、win32）'),
    osRelease: z.string().describe('操作系统版本'),
    osType: z.string().describe('操作系统类型'),
    arch: z.string().describe('系统架构（如x64、arm64）'),
    hostname: z.string().describe('系统主机名'),
    nodeVersion: z.string().describe('Node.js版本'),
    lang: z.string().nullable().describe('语言环境设置'),
    home: z.string().describe('用户主目录'),
    uptime: z.number().describe('系统运行时间（秒）'),
    memory: z.object({
      total: z.number().describe('总内存（字节）'),
      free: z.number().describe('空闲内存（字节）'),
    }).describe('内存信息'),
    cpus: z.array(z.object({
      model: z.string().describe('CPU型号'),
      speed: z.number().describe('CPU速度（MHz）'),
    })).describe('CPU信息'),
  }),
  execute: async ({ context }) => {
    const includePathDetails = context.includePathDetails || false;
    const userInfo = os.userInfo();
    const pathEnv = process.env.PATH || process.env.Path;
    
    const result: EnvironmentInfo = {
      cwd: process.cwd(),
      user: userInfo.username,
      shell: process.env.SHELL || process.env.ComSpec || null,
      path: pathEnv || null,
      platform: process.platform,
      osRelease: os.release(),
      osType: os.type(),
      arch: process.arch,
      hostname: os.hostname(),
      nodeVersion: process.version,
      lang: process.env.LANG || process.env.LANGUAGE || null,
      home: userInfo.homedir,
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      cpus: os.cpus().map(cpu => ({
        model: cpu.model,
        speed: cpu.speed,
      })),
    };
    
    // 如果需要包含PATH详情，则添加拆分后的路径条目
    if (includePathDetails && pathEnv) {
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      result.pathEntries = pathEnv.split(pathSeparator);
    }
    
    return result;
  },
});

/**
 * 获取当前环境信息
 * 
 * 这是一个便捷函数，直接调用getCurrentEnvironmentTool工具
 * 
 * @returns {Promise<EnvironmentInfo>} 包含环境信息的对象
 */
export const getCurrentEnvironment = getCurrentEnvironmentTool;
