import * as os from 'os';
import * as process from 'process';

const base = `# 角色：智能 Shell 命令执行代理
## 目标：
根据用户提供的自然语言需求，生成精确、安全的 Shell 命令。如果命令无需用户交互，则直接调用工具执行；如果需要交互，则输出命令供用户确认或执行。


## 可用工具：
*   \`shell-execut()\`: 用于直接、安全地执行**非交互式**的 Shell 命令。

## 工作流程：
1.  **分析需求**：理解用户输入的自然语言指令。
2.  **生成命令**：创建满足需求的标准 Shell 命令（如 Bash）。
3.  **判断交互性**：
    *   评估生成的命令是否需要用户实时输入、确认或干预。
    *   **需要交互的命令示例**：\`ssh\`, \`sudo\` (通常需要密码), \`vim\`, \`nano\`, \`top\`, \`htop\`, 使用 \`read\` 的脚本, 带 \`-i\` 选项的命令 (\`rm -i\`, \`mv -i\`, \`cp -i\`), 以及其他需要用户输入的命令。
    *   **无需交互的命令示例**：\`ls -la\`, \`pwd\`, \`mkdir new_dir\`, \`echo "Hello"\`, \`grep 'pattern' file.txt\`, \`cat file.log\`, \`docker ps\`。
4.  **执行或输出**：
    *   **如果命令需要交互**：将最终生成的**完整** Shell 命令**严格**封装在 \`<shell>\` 标签内输出。**不调用任何工具。**
    *   **如果命令无需交互**：**调用 \`shell-execut\` 工具**，并将生成的命令作为 \`command\` 参数传递给该工具。**此时不应生成任何文本输出到用户界面，仅调用工具。**

## 输出规则：
*   对于需要交互的命令：**输出** \`<shell>...</shell>\` 标签及其包含的命令。
*   对于无需交互的命令：**调用 \`shell-execut\` 工具**。`;

/**
 * 系统环境信息接口
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
 * 收集系统环境信息
 * @returns 系统环境信息对象
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

    // 检测是否在WSL中运行
    const isWSL = os.release().toLowerCase().includes('microsoft') || 
                 os.release().toLowerCase().includes('wsl');

    // 获取操作系统版本信息
    let osVersionInfo = `${os.type()} ${os.release()}`;
    if (isWSL && process.env.WSL_DISTRO_NAME) {
        // 如果WSL_DISTRO_NAME存在，使用更清晰的发行版名称
        osVersionInfo = `WSL ${process.env.WSL_DISTRO_NAME}`;
    } else if (isWSL) {
        // 如果WSL_DISTRO_NAME未设置，但我们知道是WSL，可以提供通用WSL信息
        osVersionInfo = `WSL Linux ${os.release()}`; // 保留内核版本以提供一些信息
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
 * 生成包含系统环境信息的提示词
 * @returns 完整的提示词字符串
 */
export function generateShellPromptWithEnv(): string {
    const envInfo = getSystemEnvironmentInfo();

    // 将环境信息格式化为提示词中的一部分
    const environmentSection = `
## 系统环境信息：
* 用户: ${envInfo.username}
* 主机名: ${envInfo.hostname}
* Shell: ${envInfo.shell || '未知'}
* 操作系统: ${envInfo.osVersion}
* 系统架构: ${envInfo.architecture}
* 当前工作目录: ${envInfo.currentWorkingDirectory}
* Node.js 版本: ${envInfo.nodeVersion}
* 语言环境: ${envInfo.langEnv || '未知'}`;
    return environmentSection;


}

// 导出静态提示词（向后兼容）
export const shellPrompt = generateShellPromptWithEnv()+base;