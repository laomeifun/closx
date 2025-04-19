import * as os from 'os';
import * as process from 'process';

export interface EnvironmentInfo {
    shell: string | undefined;
    osVersion: string;
    osPlatform: NodeJS.Platform;
    initialDirectory: string; // Directory where the node process was started
    username: string;
    hostname: string;
    currentWorkingDirectory: string; // Current working directory (can change)
    pathEnv: string | undefined;
    langEnv: string | undefined;
    architecture: string;
    nodeVersion: string;
    // You can add more information as needed
}

/**
 * Gathers relevant environment information.
 * @returns {EnvironmentInfo} An object containing environment details.
 */
export function getEnvironmentInfo(): EnvironmentInfo {
    let userInfo: os.UserInfo<string>;
    try {
        userInfo = os.userInfo();
    } catch (e) {
        // Handle cases where userInfo might fail (e.g., environments without user info)
        userInfo = { username: 'unknown', uid: -1, gid: -1, shell: null, homedir: 'unknown' };
        console.warn('Could not retrieve user info:', e);
    }
    const lang = process.env.LANG || process.env.LC_ALL;

    return {
        shell: process.env.SHELL || process.env.ComSpec, // SHELL for Unix-like, ComSpec for Windows
        osVersion: `${os.type()} ${os.release()}`, // Combine type and release for clarity
        osPlatform: os.platform(),
        initialDirectory: process.cwd(), // Directory where the Node process was started
        username: userInfo.username,
        hostname: os.hostname(),
        currentWorkingDirectory: process.cwd(), // Reflects current CWD at time of call
        pathEnv: process.env.PATH,
        langEnv: lang,
        architecture: os.arch(),
        nodeVersion: process.versions.node,
    };
}
