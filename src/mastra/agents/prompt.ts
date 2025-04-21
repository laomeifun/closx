import * as os from 'os';
import * as process from 'process';





/**
 * System environment information interface
*/
export interface SystemEnvironmentInfo {
    readonly shell: string | undefined;
    readonly osVersion: string;
    readonly osPlatform: NodeJS.Platform;
    readonly initialDirectory: string;
    readonly username: string;
    readonly hostname: string;
    readonly currentWorkingDirectory: string;
    readonly pathEnv: string | undefined;
    readonly langEnv: string | undefined;
    readonly architecture: string;
    readonly nodeVersion: string;
}

/**
 * Collect system environment information
 * @returns System environment information object
 */
export function getSystemEnvironmentInfo(): SystemEnvironmentInfo {
    let userInfo: os.UserInfo<string>;
    try {
        userInfo = os.userInfo();
    } catch (e) {
        userInfo = {
            username: 'unknown',
            uid: -1,
            gid: -1,
            shell: null,
            homedir: 'unknown'
        };
    }

    const lang = process.env.LANG || process.env.LC_ALL;

    // Detect if running in WSL
    const isWSL = os.release().toLowerCase().includes('microsoft') || 
                 os.release().toLowerCase().includes('wsl');

    // Get operating system version information
    let osVersionInfo = `${os.type()} ${os.release()}`;
    if (isWSL && process.env.WSL_DISTRO_NAME) {
        // If WSL_DISTRO_NAME exists, use more clear distro name
        osVersionInfo = `WSL ${process.env.WSL_DISTRO_NAME}`;
    } else if (isWSL) {
        // If WSL_DISTRO_NAME not set, but we know it's WSL, provide generic WSL info
        osVersionInfo = `WSL Linux ${os.release()}`; // Keep kernel version to provide some info
    }
    
    return {
        shell: process.env.SHELL || process.env.ComSpec,
        osVersion: osVersionInfo,
        osPlatform: os.platform(),
        initialDirectory: process.cwd(),
        username: userInfo.username,
        hostname: os.hostname(),
        currentWorkingDirectory: process.cwd(),
        pathEnv: process.env.PATH,
        langEnv: lang,
        architecture: os.arch(),
        nodeVersion: process.versions.node,
    };
}

/**
 * Generate prompt with system environment information
 * @returns Complete prompt string
 */
export function generateShellPromptWithEnv(): string {
    const envInfo = getSystemEnvironmentInfo();

    // Format environment information as part of the prompt
    const environmentSection = `
## System Environment Information:
* User: ${envInfo.username}
* Hostname: ${envInfo.hostname}
* Shell: ${envInfo.shell || 'Unknown'}
* OS: ${envInfo.osVersion}
* Architecture: ${envInfo.architecture}
* Current Working Directory: ${envInfo.currentWorkingDirectory}
* Node.js Version: ${envInfo.nodeVersion}
* Language Environment: ${envInfo.langEnv || 'Unknown'}`;
    return environmentSection;


}

const language = process.env.LANG || process.env.LC_ALL;

// const base = `
// # Role: Intelligent Shell Command Execution Agent
// ## Goal:
// Based on user's natural language requirements, generate precise and safe Shell commands, and call tools for execution.

// ## Available Tools:
// *   \`shell-execut()\`: For direct and safe execution of Shell commands (including those requiring interaction).

// ## Workflow:
// 1.  **Analyze Requirements**: Understand the natural language instructions provided by the user.
// 2.  **Generate Commands**: Create precise and safe standard Shell commands (e.g., Bash) that meet the requirements.
// 3.  **Execute Commands**: **Call the \`shell-execut\` tool** and pass the generated command as the \`command\` parameter to the tool.

// ## Output Rules:
// *   **Always call the \`shell-execut\` tool** to execute the generated Shell commands.
// *   Ensure all output is in ${language}.`;

// 中文版智能 Shell 命令执行代理的基础提示字符串
const base = `
# 角色：智能 Shell 命令执行代理

## 目标：
根据用户提供的自然语言需求，生成精确、安全的 Shell 命令。如果命令无需用户交互，则直接调用工具执行；如果需要交互，则输出命令供用户确认或执行。

## 可用工具：
*   \`shell-execut(command: str)\`: 用于直接、安全地执行**非交互式**的 Shell 命令。

## 工作流程：
1.  **分析需求**：理解用户输入的自然语言指令。
2.  **生成命令**：创建满足需求的标准 Shell 命令（如 Bash）。
3.  **判断交互性**：
    *   评估生成的命令是否需要用户实时输入、确认或干预。
    *   **需要交互的命令示例**：\`ssh\`, \`sudo\` (通常需要密码), \`vim\`, \`nano\`, \`top\`, \`htop\`, 使用 \`read\` 的脚本, 带 \`-i\` 选项的命令 (\`rm -i\`, \`mv -i\`, \`cp -i\`), 以及其他需要用户输入的命令。
    *   **无需交互的命令示例**：\`ls -la\`, \`pwd\`, \`mkdir new_dir\`, \`echo "Hello"\`, \`grep 'pattern' file.txt\`, \`cat file.log\`, \`docker ps\`。
4.  **执行或输出**：
    *   **如果命令需要交互**：将最终生成的**完整** Shell 命令**严格**封装在 \`<shell>\` 标签内输出。**不调用任何工具。**
    *   **如果命令无需交互**：**调用 \`shell-execut\` 工具**，并将生成的命令作为 \`command\` 参数传递给该工具。**

## 输出规则：
*   对于需要交互的命令：输出到 \`<shell>...</shell>\` 标签及其包含的命令。
*   对于无需交互的命令：**调用 \`shell-execut\` 工具**。
`;

// Export static prompt (backward compatibility)
export const shellPrompt = generateShellPromptWithEnv()+base;