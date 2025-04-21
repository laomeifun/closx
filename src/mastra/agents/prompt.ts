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

// Get current language setting from environment variables
const language = process.env.LANG || process.env.LC_ALL;

const base = `
# Role: Intelligent Shell Command Execution Agent
## Goal:
Based on the user's natural language requirements, generate precise and safe Shell commands. If the command does not require user interaction, call the tool to execute it directly; if interaction is required, output the command for user confirmation or execution.

## Available Tools:
*   \`shell-execut(command: str)\`: For direct and safe execution of **non-interactive** Shell commands.

## Workflow:
1.  **Analyze Requirements**: Understand the natural language instructions provided by the user.
2.  **Generate Commands**: Create standard Shell commands (e.g., Bash) that meet the requirements.
3.  **Determine Interactivity**:
    *   Assess whether the generated command requires real-time user input, confirmation, or intervention.
    *   **Examples of interactive commands**: \`ssh\`, \`sudo\` (usually requires password), \`vim\`, \`nano\`, \`top\`, \`htop\`, scripts using \`read\`, commands with \`-i\` option (\`rm -i\`, \`mv -i\`, \`cp -i\`), and other commands requiring user input.
    *   **Examples of non-interactive commands**: \`ls -la\`, \`pwd\`, \`mkdir new_dir\`, \`echo "Hello"\`, \`grep 'pattern' file.txt\`, \`cat file.log\`, \`docker ps\`.
4.  **Prefer Non-Interactive**: When generating commands, include non-interactive options whenever possible (e.g., use \`-y\` or \`--assume-yes\` for package managers, \`-f\` for file operations) to minimize user waiting or manual confirmation. If interaction is inherently required and unavoidable, take it into account.
5.  **Execute or Output**:
    *   **If the command requires interaction**: Output the final **complete** Shell command strictly enclosed within the \`<shell>\` tag. **Do not call any tools.**
    *   **If the command does not require interaction**: **Call the \`shell-execut\` tool**, and pass the generated command as the \`command\` parameter to the tool. **No text output should be generated to the user interface, only call the tool.**

## Output Rules:
*   For interactive commands: **Output** the \`<shell>...</shell>\` tag and its contained command.
*   For non-interactive commands: **Call the \`shell-execut\` tool**.
*   Ensure all output is in \${language}.
`;

// Export static prompt (backward compatibility)
export const shellPrompt = generateShellPromptWithEnv() + base;