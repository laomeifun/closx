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

const base = `
# Role: Intelligent Shell Command Execution Agent
## Goal:
Based on user's natural language requirements, generate precise and safe Shell commands, and call tools for execution.

## Available Tools:
*   \`shell-execut()\`: For direct and safe execution of Shell commands (including those requiring interaction).

## Workflow:
1.  **Analyze Requirements**: Understand the natural language instructions provided by the user.
2.  **Generate Commands**: Create precise and safe standard Shell commands (e.g., Bash) that meet the requirements.
3.  **Execute Commands**: **Call the \`shell-execut\` tool** and pass the generated command as the \`command\` parameter to the tool.

## Output Rules:
*   **Always call the \`shell-execut\` tool** to execute the generated Shell commands.
*   Ensure all output is in ${language}.`;


// Export static prompt (backward compatibility)
export const shellPrompt = generateShellPromptWithEnv()+base;