import { Memory } from "@mastra/memory";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/core/storage/libsql";
import { LibSQLVector } from "@mastra/core/vector/libsql";
import path from "path";
import os from "os";
import fs from "fs";

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

// 使用 path.join 和 os.homedir() 来正确展开用户主目录
const dbDir = path.join(os.homedir(), ".config", "closx");

// 检查目录是否存在，如果不存在则创建
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`创建数据库目录: ${dbDir}`);
  } catch (error) {
    console.error(`创建数据库目录失败: ${error}`);
  }
}

const dbpath = `file:${path.join(dbDir, "local.db")}`;

// Initialize memory with LibSQL defaults
export const shellMemory = new Memory({
  storage: new LibSQLStore({
    config: {
      url: dbpath,
    },
  }),
  // this is the default vector db if omitted
  vector: new LibSQLVector({
    connectionUrl: dbpath,
  }),
  options: {
    lastMessages: 5,
    semanticRecall: false,
    workingMemory: {
      enabled: true,
      use: "tool-call", // Recommended setting
    },
  },
});
