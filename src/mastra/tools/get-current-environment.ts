import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import os from 'os';
import process from 'process';

/**
 * Environment information interface definition
 */
export interface EnvironmentInfo {
  /** Current working directory */
  cwd: string;
  /** Current username */
  user: string;
  /** Default shell */
  shell: string | null;
  /** System PATH environment variable */
  path: string | null;
  /** PATH environment variable split into an array (optional) */
  pathEntries?: string[];
  /** Operating system platform */
  platform: string;
  /** Operating system release */
  osRelease: string;
  /** Operating system type */
  osType: string;
  /** System architecture */
  arch: string;
  /** System hostname */
  hostname: string;
  /** Node.js version */
  nodeVersion: string;
  /** Language environment settings */
  lang: string | null;
  /** User home directory */
  home: string;
  /** System uptime (seconds) */
  uptime: number;
  /** Memory information */
  memory: {
    /** Total memory (bytes) */
    total: number;
    /** Free memory (bytes) */
    free: number;
  };
  /** CPU summary information */
  cpuSummary?: {
    /** CPU model */
    model: string;
    /** Number of CPU cores */
    cores: number;
  };
  /** Detailed CPU information (optional) */
  cpus?: Array<{
    /** CPU model */
    model: string;
    /** CPU speed (MHz) */
    speed: number;
  }>;
}

/**
 * Tool to get current environment information
 * Returns detailed information about the system environment, including working directory, user, shell, PATH, etc.
 */
export const getCurrentEnvironmentTool = createTool({
  id: 'get-current-environment',
  description: 'Get detailed information about the current system environment',
  inputSchema: z.object({
    includePathDetails: z.boolean().optional().describe('Whether to include detailed analysis of PATH environment variable, defaults to false'),
    includeCpuDetails: z.boolean().optional().describe('Whether to include detailed CPU information, defaults to false'),
  }),
  outputSchema: z.object({
    cwd: z.string().describe('Current working directory'),
    user: z.string().describe('Current username'),
    shell: z.string().nullable().describe('Default shell'),
    path: z.string().nullable().describe('System PATH environment variable'),
    pathEntries: z.array(z.string()).optional().describe('PATH environment variable split into an array'),
    platform: z.string().describe('Operating system platform (e.g., linux, darwin, win32)'),
    osRelease: z.string().describe('Operating system version'),
    osType: z.string().describe('Operating system type'),
    arch: z.string().describe('System architecture (e.g., x64, arm64)'),
    hostname: z.string().describe('System hostname'),
    nodeVersion: z.string().describe('Node.js version'),
    lang: z.string().nullable().describe('Language environment settings'),
    home: z.string().describe('User home directory'),
    uptime: z.number().describe('System uptime (seconds)'),
    memory: z.object({
      total: z.number().describe('Total memory (bytes)'),
      free: z.number().describe('Free memory (bytes)'),
    }).describe('Memory information'),
    cpuSummary: z.object({
      model: z.string().describe('CPU model'),
      cores: z.number().describe('Number of CPU cores'),
    }).optional().describe('CPU summary information'),
    cpus: z.array(z.object({
      model: z.string().describe('CPU model'),
      speed: z.number().describe('CPU speed (MHz)'),
    })).optional().describe('Detailed CPU information'),
  }),
  execute: async ({ context }) => {
    const includePathDetails = context.includePathDetails || false;
    const includeCpuDetails = context.includeCpuDetails || false;
    const userInfo = os.userInfo();
    const pathEnv = process.env.PATH || process.env.Path;
    const cpuInfo = os.cpus();
    
    // Prepare base result object
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
      // Add CPU summary information
      cpuSummary: cpuInfo.length > 0 ? {
        model: cpuInfo[0].model.trim(),
        cores: cpuInfo.length,
      } : undefined,
    };
    
    // If PATH details are needed, add the split path entries
    if (includePathDetails && pathEnv) {
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      result.pathEntries = pathEnv.split(pathSeparator);
    }
    
    // Only include detailed CPU information when explicitly requested
    if (includeCpuDetails) {
      result.cpus = cpuInfo.map(cpu => ({
        model: cpu.model,
        speed: cpu.speed,
      }));
    }
    
    return result;
  },
});

// /**
//  * Get current environment information
//  * 
//  * This is a convenience function that directly calls the getCurrentEnvironmentTool
//  * 
//  * @returns {Promise<EnvironmentInfo>} Object containing environment information
//  */
// export const getCurrentEnvironment = getCurrentEnvironmentTool;
