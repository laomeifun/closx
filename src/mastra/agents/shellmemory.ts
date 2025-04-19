import { Memory } from '@mastra/memory';
import { Agent } from '@mastra/core/agent';


const template = `# Agent Working Memory (Internal State - Update via Tool Call)
*Instructions for Agent: This section tracks the current state of the terminal environment and interaction. Use the \`update_working_memory\` tool to modify the values below whenever the state changes significantly (e.g., after changing directory, detecting project type, or focusing on a specific file). Keep values concise and accurate.*

## 1. Environment Context
- **Current Working Directory (CWD):** \`{{cwd}}\`
  *Critical: MUST be updated immediately after every successful directory change using the \`cd\` command (or equivalent) via the \`executeShellCommand\` tool. Verify path existence if unsure.*
- **Detected Project Context:** \`{{project_context | default('unknown')}}\`
  *(Examples: 'nodejs', 'python', 'git_repo', 'docker_compose', 'none') - Update when a specific project type or context is identified.*
- **Current User:** \`{{user}}\`
  *(Usually static, set initially)*
- **Current Shell:** \`{{shell}}\`
  *(Usually static, set initially)*

## 2. Recent Interaction Summary
- **Last User Input:** \`{{last_user_input | default('N/A')}}\`
- **Last Agent Action:** \`{{last_agent_action | default('N/A')}}\`
  *(Format suggestion: Tool=<tool_name>, Args=<brief_args>, Status=<success|failure>, ResultSummary=<short_summary_or_error>)*

## 3. Current Focus / Task Context (Optional)
- **Primary File/Directory Path:** \`{{focus_path | default('none')}}\`
  *Update if the user's commands repeatedly refer to or operate on a specific file or directory path.*
- **Brief Ongoing Task:** \`{{current_task_summary | default('none')}}\`
  *(Optional: If the user states a multi-step goal, summarize it here, e.g., "Debugging Node.js app", "Cleaning up log files > 100MB")*

*End of Working Memory Section*`;

// Initialize memory with LibSQL defaults
export const shellMemory = new Memory({
    options: {
        workingMemory: {
            enabled: true,
            use: "tool-call", // Recommended setting
        },
    }
});                  