import type { Agent, ToolAction } from '@mastra/core'; // Assuming Agent type exists in @mastra/core
import type { Metric } from '@mastra/core'; // Import Metric if needed, adjust path if necessary
import { randomUUID } from 'crypto';

// Define the structure for a message in the conversation
interface Message {
  role: 'user' | 'assistant' | 'system'; // Add other roles if necessary
  content: string;
}

// Define the structure for chat options
interface ChatOptions {
  streamOutput?: boolean;
  resourceId?: string; // For maintaining context across calls if needed
  threadId?: string; // For maintaining context within a conversation
  verbose?: boolean;
}

// Define a structure for the agent's response (adjust based on actual Agent API)
// Assuming generate returns { text: string, ... } and stream returns { textStream: ..., ... }
// Let's define a common structure for the result we want to return from our utils
interface AgentUtilResponse {
  text: string; // The complete text response
  // Include other relevant fields returned by the agent if necessary
  [key: string]: any; // Allow for other properties returned by the agent
}

// Define a minimal structure for stream result (adjust if needed)
interface StreamResult {
    textStream: AsyncIterable<string>;
    // Include other relevant fields returned by the agent stream method
    [key: string]: any;
}

// Define a minimal structure for generate result (adjust if needed)
interface GenerateResult {
    text: string;
    // Include other relevant fields returned by the agent generate method
    [key: string]: any;
}


/**
 * Performs a single turn chat with the specified agent using generate or stream.
 *
 * @param agent The agent instance to chat with.
 * @param content The message content to send to the agent.
 * @param options Optional configuration for the chat interaction.
 * @returns A promise that resolves with the agent's final response.
 */
export async function chatWithAgent(
  agent: Agent<string, Record<string, ToolAction<any, any, any>>, Record<string, Metric>>, // Use the specific Agent type
  content: string,
  options: ChatOptions = {}
): Promise<AgentUtilResponse> {
  const { streamOutput = false, resourceId, threadId, verbose = false } = options;
  const messages: Message[] = [{ role: 'user', content }];

  // Determine the agent options argument based on presence of BOTH IDs
  const agentArgs = (typeof resourceId === 'string' && typeof threadId === 'string')
    ? { resourceId, threadId }
    : undefined;

  if (verbose) {
    console.log(`\n[User Input] ${content}`);
    if (threadId) console.log(`(Thread ID: ${threadId})`);
    if (resourceId) console.log(`(Resource ID: ${resourceId})`);
  }

  let finalResult: AgentUtilResponse;

  if (streamOutput) {
    if (verbose) console.log('[Agent Output Stream]');
    let fullResponseText: string = '';
    let streamMethodResult: StreamResult | null = null;
    try {
      // Correctly pass messages array and agentArgs (either object or undefined)
      streamMethodResult = await agent.stream(messages, agentArgs);
      for await (const chunk of streamMethodResult.textStream) {
        if (verbose) {
          process.stdout.write(chunk);
        }
        fullResponseText += chunk;
      }
      if (verbose) process.stdout.write('\n'); // Newline after stream ends
      // Construct the final response object from the stream result and full text
      finalResult = {
          ...streamMethodResult, // Include any other properties returned by stream()
          text: fullResponseText,
          textStream: undefined, // Remove textStream from final object if desired
      };

    } catch (error) {
        console.error("Error during stream processing:", error);
        throw error;
    }
  } else {
    try {
      // Correctly pass messages array and agentArgs (either object or undefined)
      const generateMethodResult = await agent.generate(messages, agentArgs);
      finalResult = {
          ...generateMethodResult, // Assume generate returns the final structure directly
          text: generateMethodResult.text // Ensure text property is present
      };
      if (verbose) {
        console.log(`[Agent Output] ${finalResult.text}`);
      }
    } catch (error) {
        console.error("Error during non-stream chat:", error);
        throw error;
    }
  }

  if (!finalResult) {
      throw new Error("Failed to get a response from the agent.");
  }

  // Remove the textStream property if it exists, as it's consumed
  delete finalResult.textStream;


  return finalResult;
}

/**
 * Performs a multi-turn chat conversation with the specified agent.
 * Maintains context using a generated resourceId and threadId.
 *
 * @param agent The agent instance to chat with.
 * @param messages An array of message contents for the conversation turns.
 * @param options Optional configuration for the chat interaction (verbose).
 * @returns A promise that resolves with an array of agent responses for each turn.
 */
export async function multiTurnChat(
  agent: Agent<string, Record<string, ToolAction<any, any, any>>, Record<string, Metric>>, // Use the specific Agent type
  messages: string[],
  options: Omit<ChatOptions, 'streamOutput' | 'resourceId' | 'threadId'> = {} // Exclude stream/context IDs
): Promise<AgentUtilResponse[]> {
  const { verbose = false } = options;
  // Generate unique IDs for this conversation's context
  const resourceId = `resource-${randomUUID()}`;
  const threadId = `thread-${randomUUID()}`;
  const responses: AgentUtilResponse[] = [];

  if (verbose) {
    console.log(`\nStarting multi-turn chat with Resource ID: ${resourceId}, Thread ID: ${threadId}`);
  }

  for (const message of messages) {
    // Use chatWithAgent internally for each turn, passing the context IDs
    const response = await chatWithAgent(agent, message, {
      resourceId: resourceId,
      threadId: threadId,
      verbose: verbose,
      streamOutput: false, // Default to non-streaming for simpler result collection
    });
    responses.push(response);
    // Note: The agent itself handles message history based on threadId/resourceId.
    // We just send the current user message each time.
  }

  return responses;
}
